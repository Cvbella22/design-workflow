// sync_printify_data_smart.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createObjectCsvWriter } from "csv-writer";
import csv from "csv-parser";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const PRINTIFY_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImE2OTk0YWFlZTM2MDliNzFiZDFiODAzMmIzZjI4NGRjNzcyZGNiM2EwNTE1ZTg5MGU3Mzg1Y2U5YjA5MGFjMDgyNWU1NTY1MDY4ZGRiNWFjIiwiaWF0IjoxNzYwOTE3MDY5LjAxOTM2MywibmJmIjoxNzYwOTE3MDY5LjAxOTM2NCwiZXhwIjoxNzkyNDUzMDY5LjAxMDE3OSwic3ViIjoiMTgxNjAzOTAiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.fTWXPmRegkDEhjT7VKZXaHgMFtimwYYwfCPAH92s8Nj--6JPnQQTu5DCIZxGo_PSf8D7YaEWcVU7aSNQr8j_OC_A0NaStT_A9dfVMwHOnkHP9wva3EKkKIVxtqsw19EZfYc9TbXJnsc_gJNDTBbvKo4rB9x6XfTGkopOSCk-ubjwX-ys8wvtdNUBqMOqRSBb9kAr1B-x6ndauRJ7vq2CXbH-GU8TKkPY4eea3JxYF9y5ojSpIQbkwlhgB9Yq0GUo_7ENA1N4_WgPv1P6YGzDbvBgfZvQRwhkKWlPE7GagJy_NmuhNX7VOpwI7oSs38yFysyeHQH1zh4huWAtq35i_IQn2ywXT7nkMjDaT9jF8r_JqmvoxfkPujLODaW_XnXCV8S_9GQrfhriuyG1-Owc7Pjuuk5jE9r5BMKvg25VspJoGd5LXKXe_BAVBqSv5MRyV9EBlpclCfi-cbDrphrbM-KNbGpdIeHCclRfn2PcMrjRqxJmBJ3KAX8rqzpviOupUEBwI8il8IlZGC8Z2iNxOIwOIUkQU7B5Lie-_AblbbGJQVHALjRnm45avLz3t3EKxSTrwGEJ-i82JNajgeMecF3ePtc9L3eh5kuFQdwuakurYRxuTX8LXEvvOIwAOHkmhgjjsq-tm4SdlFDWy4mgPM7vZfKSs0TFpjrjr-SLBqI";
const PRINTIFY_SHOP_ID = 18000114;

if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
  console.error("❌ Missing PRINTIFY_API_KEY or PRINTIFY_SHOP_ID in .env");
  process.exit(1);
}

const CSV_PATH = path.join(process.cwd(), "printify_products_master.csv");

// ✅ Helper to read existing CSV (Etsy data)
function readExistingCSV() {
  return new Promise((resolve) => {
    const rows = [];
    if (!fs.existsSync(CSV_PATH)) return resolve(rows);
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

// ✅ Fetch Printify products
async function fetchProducts() {
  console.log("🔗 Fetching products from Printify...");
  const res = await fetch(
    `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json`,
    { headers: { Authorization: `Bearer ${PRINTIFY_API_KEY}` } }
  );

  if (!res.ok) {
    console.error(`❌ Fetch error: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const json = await res.json();
  return json.data || [];
}

// ✅ Merge new Printify data with existing CSV (Etsy data)
function mergeData(printifyData, existingRows) {
  const updatedRows = [];

  for (const p of printifyData) {
    const existing = existingRows.find((r) => r.PRODUCT_ID === p.id);

    const baseData = {
      PRODUCT_ID: p.id,
      TITLE: existing?.TITLE || p.title || "",
      DESCRIPTION: existing?.DESCRIPTION || "",
      PRICE: existing?.PRICE || "",
      CURRENCY: existing?.CURRENCY || "USD",
      QUANTITY: existing?.QUANTITY || 1,
      TAGS: existing?.TAGS || "",
      MATERIALS: existing?.MATERIALS || "",
      VARIANT_COUNT: p.variants?.length || 0,
      CREATED_AT: p.created_at,
      UPDATED_AT: new Date().toISOString(),
      PRINT_PROVIDER_ID: p.print_provider_id,
      BLUEPRINT_ID: p.blueprint_id,
      VISIBLE: p.visible,
    };

    updatedRows.push(baseData);
  }

  // Keep Etsy listings that are no longer in Printify (optional)
  for (const e of existingRows) {
    if (!updatedRows.find((r) => r.PRODUCT_ID === e.PRODUCT_ID)) {
      updatedRows.push(e);
    }
  }

  return updatedRows;
}

// ✅ Write merged data back to CSV
async function writeCSV(rows) {
  const csvWriter = createObjectCsvWriter({
    path: CSV_PATH,
    header: [
      { id: "PRODUCT_ID", title: "PRODUCT_ID" },
      { id: "TITLE", title: "TITLE" },
      { id: "DESCRIPTION", title: "DESCRIPTION" },
      { id: "PRICE", title: "PRICE" },
      { id: "CURRENCY", title: "CURRENCY" },
      { id: "QUANTITY", title: "QUANTITY" },
      { id: "TAGS", title: "TAGS" },
      { id: "MATERIALS", title: "MATERIALS" },
      { id: "VARIANT_COUNT", title: "VARIANT_COUNT" },
      { id: "CREATED_AT", title: "CREATED_AT" },
      { id: "UPDATED_AT", title: "UPDATED_AT" },
      { id: "PRINT_PROVIDER_ID", title: "PRINT_PROVIDER_ID" },
      { id: "BLUEPRINT_ID", title: "BLUEPRINT_ID" },
      { id: "VISIBLE", title: "VISIBLE" },
    ],
  });

  await csvWriter.writeRecords(rows);
  console.log(`💾 Updated CSV saved → ${CSV_PATH}`);
}

// ✅ Main function
(async () => {
  try {
    const [existingRows, printifyData] = await Promise.all([
      readExistingCSV(),
      fetchProducts(),
    ]);

    console.log(`📦 Found ${printifyData.length} Printify products`);
    console.log(`🧾 Loaded ${existingRows.length} existing CSV rows`);

    const merged = mergeData(printifyData, existingRows);
    await writeCSV(merged);

    console.log("✅ Smart sync complete!");
  } catch (err) {
    console.error("❌ Sync failed:", err);
  }
})();
