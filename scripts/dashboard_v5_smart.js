// 🌌 COSMICSOL DASHBOARD v5 — SMART AUTOMATION ENGINE
// Author: Code GPT
// Description: Unified control center for AI metadata generation, refinement, batch automation,
// logging, and file system management using LM Studio (localhost:1234).

import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import chokidar from "chokidar";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// 🧩 Fix Windows CMD Enter key bug
if (process.stdin.isTTY) {
  try { process.stdin.setRawMode(true); } catch {}
}

console.clear();
console.log(chalk.cyanBright.bold("🌌 COSMICSOL DASHBOARD v5 — SMART AUTOMATION ENGINE\n"));

// --- PATHS & CONSTANTS -------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");
const MOCKUPS_DIR = path.join(ROOT_DIR, "_03_COMPLETED_MOCKUPS");
const METADATA_DIR = path.join(ROOT_DIR, "_05_METADATA_DRAFTS");
const LISTING_DIR = path.join(ROOT_DIR, "_04_ETSY_LISTING_READY");
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const HISTORY_DIR = path.join(ROOT_DIR, "_06_METADATA_HISTORY");

const LM_ENDPOINT = "http://localhost:1234"; // Auto-connect to LM Studio
const MODEL_NAME = "llama3"; // Default model for refinement
const CSV_PATH = path.join(METADATA_DIR, "metadata_master.csv");

// --- UTILITIES ---------------------------------------------------------------

// Ensure required folders exist
function ensureFolders() {
  const dirs = [MOCKUPS_DIR, METADATA_DIR, LISTING_DIR, LOGS_DIR, HISTORY_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.yellow(`🟡 Created folder: ${path.basename(dir)}`));
    }
  }
}

// Append log message
function log(message) {
  ensureFolders();
  const file = path.join(LOGS_DIR, `${new Date().toISOString().split("T")[0]}.txt`);
  const timestamp = new Date().toLocaleTimeString();
  fs.appendFileSync(file, `[${timestamp}] ${message}\n`);
}

// Ping LM Studio to verify connection
async function verifyLMStudio() {
  try {
    const res = await fetch(`${LM_ENDPOINT}/api/tags`);
    if (!res.ok) throw new Error("Bad response");
    console.log(chalk.green(`✅ Connected to LM Studio at ${LM_ENDPOINT}`));
    return true;
  } catch {
    console.log(chalk.red("❌ LM Studio not detected — please ensure it's running on port 1234"));
    return false;
  }
}

// Read and parse CSV into array of objects
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const cols = line.split(",");
    return headers.reduce((acc, h, i) => ({ ...acc, [h]: cols[i] }), {});
  });
}

// Write array of objects to CSV
function writeCSV(filePath, data) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => obj[h] || "").join(","));
  fs.writeFileSync(filePath, [headers.join(","), ...rows].join("\n"));
}

// Timestamp helper
const now = () => new Date().toLocaleTimeString();

// --- SESSION TRACKING --------------------------------------------------------

const SESSION_FILE = path.join(LOGS_DIR, "last_session.json");

function saveSession(state) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));
}

function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
}

// --- MENU NAVIGATION ---------------------------------------------------------
// --- MENU NAVIGATION --------------------------------------------------------

async function mainMenu() {
  console.log(chalk.bold.cyan("\n📜 MAIN MENU — Choose an action:\n"));

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Select an option:",
      choices: [
        "🧠 Generate Metadata (Local AI)",
        "✨ Refine Existing Metadata (AI Enhanced)",
        "🎨 Analyze Images (AI Visual Review)",
        "🧩 Run Quality Inspector (AI Review)",
        "⚡ Batch Tools & File Management",
        "👀 Watch Mode (Auto Generate)",
        "📊 View Log Summary",
        "🚪 Exit"
      ]
    }
  ]);

  switch (choice) {
    case "🧠 Generate Metadata (Local AI)": 
      return await generateMetadataBatch();

    case "✨ Refine Existing Metadata (AI Enhanced)": 
      return await refineExistingMetadata();

    case "🎨 Analyze Images (AI Visual Review)": 
      return await analyzeImages();

    case "🧩 Run Quality Inspector (AI Review)": 
      return await runQualityInspector();

    case "⚡ Batch Tools & File Management": 
      return await batchTools();

    case "👀 Watch Mode (Auto Generate)": 
      return await startWatchMode();

    case "📊 View Log Summary": 
      return await summarizeLogs();

    case "🚪 Exit":
      console.log(chalk.cyanBright("\n👋 Exiting CosmicSol Dashboard v6...\n"));
      log("Exited CosmicSol Dashboard v6");
      process.exit(0);
  }
}

// --- AI METADATA GENERATION --------------------------------------------------

async function generateMetadataBatch() {
  console.log(chalk.cyanBright("\n🧠 Running AI Metadata Generator...\n"));
  log("Started metadata generation batch");

  const connected = await verifyLMStudio();
  if (!connected) {
    console.log(chalk.red("❌ Aborting metadata generation — LM Studio unavailable."));
    return mainMenu();
  }

  ensureFolders();

  // Scan mockups for new designs
  const files = fs.readdirSync(MOCKUPS_DIR)
    .filter(f => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"));

  if (!files.length) {
    console.log(chalk.yellow("⚠ No new mockups found in _03_COMPLETED_MOCKUPS."));
    return mainMenu();
  }

  const existing = readCSV(CSV_PATH);
  const existingNames = new Set(existing.map(e => e.filename));

  for (const file of files) {
    const filePath = path.join(MOCKUPS_DIR, file);

    if (existingNames.has(file)) {
      console.log(chalk.gray(`⏭️  Skipping already processed: ${file}`));
      continue;
    }

    console.log(chalk.blueBright(`📄 Generating metadata for: ${file}`));
    log(`Generating metadata for ${file}`);

    // AI PROMPT — describe artwork
    const prompt = `
You are an AI assistant describing wall art canvas designs for an Etsy shop.
Generate an SEO-optimized title, 13 tags, and a detailed description with storytelling
for this artwork: "${file}". Mention visual details, style, emotion, and color tones.
`;

    const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        max_tokens: 400,
        temperature: 0.8,
      }),
    }).catch(e => ({ ok: false, statusText: e.message }));

    let resultText = "";
    if (response.ok) {
      const data = await response.json();
      resultText = data.choices?.[0]?.text?.trim() || "No result.";
    } else {
      console.log(chalk.red(`❌ LM Studio request failed: ${response.statusText}`));
      log(`Error: Failed to get metadata for ${file}`);
      continue;
    }

    // Parse AI result
    const metadata = {
      filename: file,
      title: extractField(resultText, "title"),
      description: extractField(resultText, "description"),
      tags: extractField(resultText, "tags"),
      created_at: new Date().toISOString(),
    };

    // Save to CSV and JSON
    existing.push(metadata);
    writeCSV(CSV_PATH, existing);
    const jsonFile = path.join(METADATA_DIR, `${path.parse(file).name}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(metadata, null, 2));

    console.log(chalk.green(`✅ Metadata created for ${file}`));
    log(`Completed metadata for ${file}`);
  }

  console.log(chalk.greenBright("\n✅ Metadata generation completed.\n"));
  log("Metadata batch completed successfully");
  return mainMenu();
}

// Extract fields from AI text output
function extractField(text, field) {
  const lower = text.toLowerCase();
  const patterns = {
    title: /(title:|name:)\s*(.*)/i,
    description: /(description:|details:)\s*([\s\S]*)/i,
    tags: /(tags:|keywords:)\s*(.*)/i,
  };
  const match = text.match(patterns[field]);
  if (match) return match[2]?.trim().replace(/\n/g, " ");
  if (field === "tags") return "art, wall decor, canvas, home, interior";
  return "";
}

// --- AI METADATA REFINEMENT --------------------------------------------------

async function refineExistingMetadata() {
  console.log(chalk.cyanBright("\n✨ Refining existing metadata with AI...\n"));
  log("Started metadata refinement");

  const connected = await verifyLMStudio();
  if (!connected) return mainMenu();

  const files = fs.readdirSync(METADATA_DIR).filter(f => f.endsWith(".json"));
  if (!files.length) {
    console.log(chalk.yellow("⚠️ No metadata files found for refinement."));
    return mainMenu();
  }

  for (const file of files) {
    const filePath = path.join(METADATA_DIR, file);
    const metadata = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const baseTitle = metadata.title || path.parse(file).name;

    console.log(chalk.magenta(`🧩 Refining: ${baseTitle}`));

    const prompt = `
Refine and enhance this metadata for an Etsy wall art listing:
Title: ${metadata.title}
Description: ${metadata.description}
Tags: ${metadata.tags}

Ensure the writing is vivid, artistic, and optimized for Etsy SEO.
Maintain emotional tone and descriptive detail.
`;

    const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        max_tokens: 400,
        temperature: 0.85,
      }),
    }).catch(e => ({ ok: false, statusText: e.message }));

    let resultText = "";
    if (response.ok) {
      const data = await response.json();
      resultText = data.choices?.[0]?.text?.trim() || "No result.";
    } else {
      console.log(chalk.red(`❌ LM Studio request failed: ${response.statusText}`));
      continue;
    }

    const refined = {
      ...metadata,
      refined_title: extractField(resultText, "title"),
      refined_description: extractField(resultText, "description"),
      refined_tags: extractField(resultText, "tags"),
      refined_at: new Date().toISOString(),
    };

    const historyFile = path.join(HISTORY_DIR, `${path.parse(file).name}_v${Date.now()}.json`);
    fs.writeFileSync(historyFile, JSON.stringify(refined, null, 2));
    fs.writeFileSync(filePath, JSON.stringify(refined, null, 2));

    console.log(chalk.green(`✅ Refined: ${metadata.title}`));
    log(`Refined metadata for ${file}`);
  }

  console.log(chalk.greenBright("\n✨ Refinement complete.\n"));
  log("Metadata refinement completed");
  return mainMenu();
}
// --- BATCH TOOLS & FILE MANAGEMENT ------------------------------------------

async function batchTools() {
  console.log(chalk.cyanBright("\n⚡ Batch Tools & File Management\n"));
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose a batch action:",
      choices: [
        "🧩 Validate Folder Structure",
        "📦 Clean & Auto-Sort Files",
        "🔁 Rebuild CSV from JSONs",
        "🧠 Regenerate All Metadata (Skip Existing)",
        "🪶 Bulk Refine All Metadata",
        "↩️ Back to Main Menu"// ✅
      ]
    }
  ]);

  switch (action) {
    case "🧩 Validate Folder Structure": return validateFolders();
    case "📦 Clean & Auto-Sort Files": return autoSortFiles();
    case "🔁 Rebuild CSV from JSONs": return rebuildCSV();
    case "🧠 Regenerate All Metadata (Skip Existing)": return generateMetadataBatch();
    case "🪶 Bulk Refine All Metadata": return refineExistingMetadata();
    case "↩️ Back to Main Menu": return mainMenu();
  }
}

// Validate essential folders and report missing items
function validateFolders() {
  console.log(chalk.yellow("\n🔍 Validating folder integrity..."));
  ensureFolders();
  const dirs = [MOCKUPS_DIR, METADATA_DIR, LISTING_DIR, HISTORY_DIR];
  for (const dir of dirs) {
    const count = fs.readdirSync(dir).length;
    console.log(chalk.gray(`📁 ${path.basename(dir)} — ${count} items`));
  }
  log("Validated folder structure");
  console.log(chalk.green("\n✅ Validation complete.\n"));
  return mainMenu();
}

// Automatically organize misplaced files
function autoSortFiles() {
  console.log(chalk.yellow("\n📦 Running Smart File Sorter..."));
  log("Auto-sort initiated");

  const allFiles = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  for (const entry of allFiles) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();

    let targetDir;
    if ([".png", ".jpg", ".jpeg"].includes(ext)) targetDir = MOCKUPS_DIR;
    else if ([".json"].includes(ext)) targetDir = METADATA_DIR;
    else if ([".csv"].includes(ext)) targetDir = METADATA_DIR;
    else continue;

    const sourcePath = path.join(ROOT_DIR, entry.name);
    const destPath = path.join(targetDir, entry.name);
    fs.renameSync(sourcePath, destPath);
    console.log(chalk.blue(`➡️ Moved ${entry.name} → ${path.basename(targetDir)}`));
    log(`Moved ${entry.name} to ${targetDir}`);
  }

  console.log(chalk.green("\n✅ Auto-sort completed.\n"));
  return mainMenu();
}

// Rebuild CSV master file from all JSONs
function rebuildCSV() {
  console.log(chalk.yellow("\n🔁 Rebuilding metadata_master.csv from JSON files..."));
  const jsonFiles = fs.readdirSync(METADATA_DIR).filter(f => f.endsWith(".json"));
  if (!jsonFiles.length) {
    console.log(chalk.red("⚠️ No JSON metadata found."));
    return mainMenu();
  }

  const data = jsonFiles.map(f => {
    const obj = JSON.parse(fs.readFileSync(path.join(METADATA_DIR, f), "utf8"));
    return {
      filename: obj.filename || f,
      title: obj.refined_title || obj.title || "",
      description: obj.refined_description || obj.description || "",
      tags: obj.refined_tags || obj.tags || "",
      created_at: obj.created_at || "",
      refined_at: obj.refined_at || "",
    };
  });

  writeCSV(CSV_PATH, data);
  console.log(chalk.green(`✅ Rebuilt CSV with ${data.length} entries.`));
  log(`Rebuilt CSV file with ${data.length} entries`);
  return mainMenu();
}

// --- WATCH MODE --------------------------------------------------------------

async function startWatchMode() {
  console.log(chalk.cyanBright("\n👀 Watch Mode Activated — monitoring for new mockups...\n"));
  log("Watch mode started");

  ensureFolders();

  const watcher = chokidar.watch(MOCKUPS_DIR, { persistent: true, ignoreInitial: true });
  watcher.on("add", async (filePath) => {
    const file = path.basename(filePath);
    console.log(chalk.blueBright(`📥 New file detected: ${file}`));
    await generateMetadataForFile(filePath);
  });
}

async function generateMetadataForFile(filePath) {
  const file = path.basename(filePath);
  const existing = readCSV(CSV_PATH);
  const alreadyExists = existing.some(e => e.filename === file);
  if (alreadyExists) return console.log(chalk.gray(`⏭️ Already processed: ${file}`));

  const prompt = `
You are describing a new wall art piece for Etsy.
Generate a title, tags, and story-driven description for this image: ${file}.
`;

  const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt,
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  const resultText = data.choices?.[0]?.text?.trim() || "";

  const metadata = {
    filename: file,
    title: extractField(resultText, "title"),
    description: extractField(resultText, "description"),
    tags: extractField(resultText, "tags"),
    created_at: new Date().toISOString(),
  };

  existing.push(metadata);
  writeCSV(CSV_PATH, existing);
  const jsonFile = path.join(METADATA_DIR, `${path.parse(file).name}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(metadata, null, 2));

  console.log(chalk.green(`✅ Metadata auto-generated for ${file}`));
  log(`Watch mode generated metadata for ${file}`);
}

// --- LOG SUMMARIZATION -------------------------------------------------------

async function summarizeLogs() {
  console.log(chalk.cyanBright("\n📊 Generating Daily Log Summary...\n"));
  ensureFolders();

  const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".txt"));
  if (!files.length) return console.log(chalk.yellow("⚠️ No log files found."));

  const recentLog = files.sort().reverse()[0];
  const logText = fs.readFileSync(path.join(LOGS_DIR, recentLog), "utf8");

  const prompt = `
Summarize the following activity log in plain English with an artistic tone.
Highlight successes, errors, and productivity insights:

${logText}
`;

  const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_NAME, prompt, max_tokens: 400, temperature: 0.7 }),
  });

  const data = await response.json();
  const summary = data.choices?.[0]?.text?.trim() || "Summary unavailable.";

  fs.writeFileSync(path.join(LOGS_DIR, "daily_summary.txt"), summary);
  console.log(chalk.green("\n✅ Daily Summary Generated:\n"));
  console.log(chalk.gray(summary));
  log("Generated daily log summary");
  return mainMenu();
}

// --- INIT --------------------------------------------------------------------

(async () => {
  ensureFolders();
  await verifyLMStudio();

  const session = loadSession();
  if (session) {
    const { resume } = await inquirer.prompt([
      { type: "confirm", name: "resume", message: `Resume last session (${session.lastAction})?`, default: false }
    ]);
    if (resume) {
      console.log(chalk.green(`Resuming session: ${session.lastAction}`));
      await generateMetadataBatch();
      return;
    }
  }

  await mainMenu();
})();
// --- AI QUALITY INSPECTOR ----------------------------------------------------

// --- AI IMAGE CLASSIFIER (HYBRID MODE) --------------------------------------

import Jimp from "jimp";

async function analyzeImages() {
  console.log(chalk.cyanBright("\n🎨 Running AI Visual Analysis on Artworks...\n"));
  log("Started visual analysis");

  const connected = await verifyLMStudio();
  if (!connected) return mainMenu();

  ensureFolders();
  const images = fs.readdirSync(MOCKUPS_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f));

  if (!images.length) {
    console.log(chalk.yellow(⚠️ No image files found for analysis."));
    return mainMenu();
  }

  const visualIndex = [];

  for (const file of images) {
    const filePath = path.join(MOCKUPS_DIR, file);
    console.log(chalk.blueBright(`🧩 Analyzing ${file}...`));

    // 🧬 1. Extract dominant colors from pixels
    let colors = [];
    try {
      const img = await Jimp.read(filePath);
      const colorCounts = {};
      img.resize(64, 64); // downscale for speed
      for (let y = 0; y < img.bitmap.height; y++) {
        for (let x = 0; x < img.bitmap.width; x++) {
          const hex = Jimp.intToRGBA(img.getPixelColor(x, y));
          const rgb = [hex.r, hex.g, hex.b];
          const colorName = rgbToName(rgb);
          colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
        }
      }
      colors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);
    } catch (err) {
      console.log(chalk.red(`⚠️ Color extraction failed for ${file}: ${err.message}`));
      colors = ["unknown"];
    }

    // 🧠 2. Ask LM Studio to identify subject, mood, and artistic style
    const aiPrompt = `
Analyze this artwork based on its filename and color palette:
Filename: ${file}
Colors: ${colors.join(", ")}
Provide a short JSON summary with fields:
{
  "subject": "",
  "style": "",
  "mood": "",
  "tone": "",
  "keywords": []
}
`;

    const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: aiPrompt,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.text?.trim() || "{}";
    let visionMeta = {};
    try { visionMeta = JSON.parse(text); } catch {
      visionMeta = { subject: "unknown", style: "unknown", mood: "neutral", tone: "plain", keywords: [] };
    }

    const visualData = {
      file,
      colors,
      ...visionMeta,
      analyzed_at: new Date().toISOString()
    };
    visualIndex.push(visualData);

    // Merge into metadata if exists
    const jsonFile = path.join(METADATA_DIR, `${path.parse(file).name}.json`);
    if (fs.existsSync(jsonFile)) {
      const meta = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
      const merged = { ...meta, visual_analysis: visualData };
      fs.writeFileSync(jsonFile, JSON.stringify(merged, null, 2));
    }

    console.log(chalk.green(`✅ Visual analysis complete for ${file}`));
    log(`Analyzed image ${file}`);
  }

  const indexFile = path.join(METADATA_DIR, "visual_index.json");
  fs.writeFileSync(indexFile, JSON.stringify(visualIndex, null, 2));
  console.log(chalk.greenBright("\n✅ All images analyzed. Visual index saved."));
  console.log(chalk.gray(`📁 ${indexFile}`));
  log("Visual analysis complete");
  return mainMenu();
}

// Convert RGB to basic color name (fast approximation)
function rgbToName([r, g, b]) {
  const avg = (r + g + b) / 3;
  if (avg < 50) return "black";
  if (avg > 200) return "white";
  if (r > g && r > b) return "red";
  if (g > r && g > b) return "green";
  if (b > r && b > g) return "blue";
  if (r > b && g > b) return "yellow";
  if (r > g && b > g) return "magenta";
  if (g > r && b > r) return "cyan";
  return "gray";
}

async function runQualityInspector() {
  console.log(chalk.cyanBright("\n🧠 Running AI Quality Inspector...\n"));
  log("Started Quality Inspection");

  const connected = await verifyLMStudio();
  if (!connected) return mainMenu();

  const files = fs.readdirSync(METADATA_DIR).filter(f => f.endsWith(".json"));
  if (!files.length) {
    console.log(chalk.yellow(⚠️ No metadata found to inspect."));
    return mainMenu();
  }

  const report = [];
  for (const file of files) {
    const metadata = JSON.parse(fs.readFileSync(path.join(METADATA_DIR, file), "utf8"));
    const title = metadata.refined_title || metadata.title || "";
    const desc = metadata.refined_description || metadata.description || "";
    const tags = metadata.refined_tags || metadata.tags || "";

    const prompt = `
Rate the following Etsy metadata for wall art on a scale of 1 to 10.
Provide:
1. Overall Score
2. One-line feedback
3. Optionally, an improved version (if score <7)

Metadata:
Title: ${title}
Description: ${desc}
Tags: ${tags}
`;

    const response = await fetch(`${LM_ENDPOINT}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        max_tokens: 400,
        temperature: 0.6,
      }),
    });

    const data = await response.json();
    const resultText = data.choices?.[0]?.text?.trim() || "No result";

    const scoreMatch = resultText.match(/([0-9]|10)(?=\/?10?)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : "N/A";

    report.push({ file, score, feedback: resultText });
    console.log(chalk.yellow(`📝 ${file} → ${score}/10`));

    // Optional auto-rewrite for low scores
    if (score !== "N/A" && score < 7) {
      console.log(chalk.magenta(`🔁 Improving weak metadata for ${file}...`));
      const improvePrompt = `
Improve the following Etsy metadata for better storytelling, clarity, and SEO.
Keep it artistic and emotionally engaging.

${resultText}
`;
      const fixResponse = await fetch(`${LM_ENDPOINT}/v1/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL_NAME, prompt: improvePrompt, max_tokens: 400, temperature: 0.9 }),
      });
      const fixData = await fixResponse.json();
      const improved = fixData.choices?.[0]?.text?.trim() || "";

      metadata.refined_description = improved;
      fs.writeFileSync(path.join(METADATA_DIR, file), JSON.stringify(metadata, null, 2));
      log(`Auto-improved weak metadata for ${file}`);
    }
  }

  const summaryFile = path.join(LOGS_DIR, "quality_report.txt");
  const jsonReport = path.join(LOGS_DIR, "quality_audit.json");
  fs.writeFileSync(summaryFile, report.map(r => `${r.file} → ${r.score}\n${r.feedback}\n`).join("\n"));
  fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2));

  console.log(chalk.greenBright("\n✅ Quality Inspection Complete."));
  console.log(chalk.gray(`Results saved to logs/quality_report.txt`));
  log("Quality Inspector completed");
  return mainMenu();
}
