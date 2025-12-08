
// sync_printify_data.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createObjectCsvWriter } from "csv-writer";

// ✅ Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env") });

// ✅ Get credentials from .env
const PRINTIFY_API_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImE2OTk0YWFlZTM2MDliNzFiZDFiODAzMmIzZjI4NGRjNzcyZGNiM2EwNTE1ZTg5MGU3Mzg1Y2U5YjA5MGFjMDgyNWU1NTY1MDY4ZGRiNWFjIiwiaWF0IjoxNzYwOTE3MDY5LjAxOTM2MywibmJmIjoxNzYwOTE3MDY5LjAxOTM2NCwiZXhwIjoxNzkyNDUzMDY5LjAxMDE3OSwic3ViIjoiMTgxNjAzOTAiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.fTWXPmRegkDEhjT7VKZXaHgMFtimwYYwfCPAH92s8Nj--6JPnQQTu5DCIZxGo_PSf8D7YaEWcVU7aSNQr8j_OC_A0NaStT_A9dfVMwHOnkHP9wva3EKkKIVxtqsw19EZfYc9TbXJnsc_gJNDTBbvKo4rB9x6XfTGkopOSCk-ubjwX-ys8wvtdNUBqMOqRSBb9kAr1B-x6ndauRJ7vq2CXbH-GU8TKkPY4eea3JxYF9y5ojSpIQbkwlhgB9Yq0GUo_7ENA1N4_WgPv1P6YGzDbvBgfZvQRwhkKWlPE7GagJy_NmuhNX7VOpwI7oSs38yFysyeHQH1zh4huWAtq35i_IQn2ywXT7nkMjDaT9jF8r_JqmvoxfkPujLODaW_XnXCV8S_9GQrfhriuyG1-Owc7Pjuuk5jE9r5BMKvg25VspJoGd5LXKXe_BAVBqSv5MRyV9EBlpclCfi-cbDrphrbM-KNbGpdIeHCclRfn2PcMrjRqxJmBJ3KAX8rqzpviOupUEBwI8il8IlZGC8Z2iNxOIwOIUkQU7B5Lie-_AblbbGJQVHALjRnm45avLz3t3EKxSTrwGEJ-i82JNajgeMecF3ePtc9L3eh5kuFQdwuakurYRxuTX8LXEvvOIwAOHkmhgjjsq-tm4SdlFDWy4mgPM7vZfKSs0TFpjrjr-SLBqI";
const PRINTIFY_SHOP_ID=18000114;

// ✅ Validate credentials
if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
  console.error("❌ Missing PRINTIFY_API_KEY or PRINTIFY_SHOP_ID in .env");
  process.exit(1);
}

// ✅ File path for CSV
const CSV_PATH = path.join(process.cwd(), "printify_products_master.csv");

// ✅ Fetch all products
async function fetchProducts() {
  console.log("🔗 Fetching products from Printify...");

  const response = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json`, {
    headers: { Authorization: `Bearer ${PRINTIFY_API_KEY}` },
  });

  if (!response.ok) {
    console.error(`❌ Fetch error: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error(errorText);
    process.exit(1);
  }

  const data = await response.json();
  return data.data || [];
}

// ✅ Save products to CSV
async function saveToCSV(products) {
  if (!products.length) {
    console.warn("⚠️ No products found — nothing to save.");
    return;
  }

  const csvWriter = createObjectCsvWriter({
    path: CSV_PATH,
    header: [
      { id: "id", title: "PRODUCT_ID" },
      { id: "title", title: "TITLE" },
      { id: "created_at", title: "CREATED_AT" },
      { id: "visible", title: "VISIBLE" },
      { id: "blueprint_id", title: "BLUEPRINT_ID" },
      { id: "print_provider_id", title: "PRINT_PROVIDER_ID" },
      { id: "variants_count", title: "VARIANT_COUNT" },
    ],
  });

  const records = products.map((p) => ({
    id: p.id,
    title: p.title,
    created_at: p.created_at,
    visible: p.visible,
    blueprint_id: p.blueprint_id,
    print_provider_id: p.print_provider_id,
    variants_count: p.variants?.length || 0,
  }));

  await csvWriter.writeRecords(records);
  console.log(`💾 Saved ${records.length} products → ${CSV_PATH}`);
}

// ✅ Main runner
(async () => {
  try {
    const products = await fetchProducts();
    console.log(`📦 Found ${products.length} products`);
    await saveToCSV(products);
    console.log("✅ Sync complete!");
  } catch (err) {
    console.error("❌ Sync failed:", err.message);
  }
})();
