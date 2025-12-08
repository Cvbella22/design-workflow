# validate_folders_v2.py
"""
POD Workflow Validator v2
-------------------------
Performs full system integrity check for your 'design-workflow' directory.
Verifies required folders, core files, and key template content.
Auto-creates missing folders and logs all results.
"""

import os
from datetime import datetime

# --- CONFIGURE BASE PATH ---
BASE_PATH = r"C:\Users\Christine\Documents\design-workflow"

# --- REQUIRED FOLDERS ---
REQUIRED_FOLDERS = [
    "collections",
    "config",
    "designs",
    "logs",
    "metadata",
    "mockup_templates",
    "mockups_output",
    "node_modules",
    "psd_templates",
    "scripts"
]

# --- REQUIRED FILES ---
REQUIRED_FILES = [
    ".env",
    "package.json",
    "package-lock.json"
]

# --- LOG SETUP ---
LOG_DIR = os.path.join(BASE_PATH, "logs")
LOG_FILE = os.path.join(LOG_DIR, "folder_check.log")
os.makedirs(LOG_DIR, exist_ok=True)

def log(message: str):
    """Append message to log file with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def check_folders():
    """Validate required folders exist; create if missing."""
    log("\n--- FOLDER VALIDATION ---")
    created, existing = 0, 0

    for folder in REQUIRED_FOLDERS:
        full_path = os.path.join(BASE_PATH, folder)
        if os.path.exists(full_path):
            log(f"✅ Exists: {folder}")
            existing += 1
        else:
            os.makedirs(full_path)
            log(f"🧱 Created missing folder: {folder}")
            created += 1

    log(f"Summary: {existing} existing | {created} created\n")

def check_files():
    """Ensure required files exist."""
    log("--- FILE VALIDATION ---")
    found, missing = 0, 0

    for file_name in REQUIRED_FILES:
        file_path = os.path.join(BASE_PATH, file_name)
        if os.path.exists(file_path):
            log(f"✅ File found: {file_name}")
            found += 1
        else:
            log(f"⚠️ Missing file: {file_name}")
            missing += 1

    log(f"Summary: {found} found | {missing} missing\n")

def check_template_content():
    """Warn if key template folders are empty."""
    log("--- TEMPLATE CONTENT CHECK ---")
    template_dirs = ["mockup_templates", "psd_templates"]

    for dir_name in template_dirs:
        full_path = os.path.join(BASE_PATH, dir_name)
        if not os.path.exists(full_path):
            log(f"⚠️ Template folder missing: {dir_name}")
            continue
        files = [f for f in os.listdir(full_path) if not f.startswith(".")]
        if len(files) == 0:
            log(f"⚠️ Empty template folder: {dir_name}")
        else:
            log(f"✅ {dir_name} contains {len(files)} file(s)")

    log("--- TEMPLATE CHECK COMPLETE ---\n")

def run_validator():
    """Main workflow."""
    log("\n==============================")
    log("🚀 POD Workflow Full System Check Started")
    log("==============================")
    check_folders()
    check_files()
    check_template_content()
    log("✅ Validation Complete. System Ready.\n")

if __name__ == "__main__":
    run_validator()
    input("\nPress Enter to exit...")
