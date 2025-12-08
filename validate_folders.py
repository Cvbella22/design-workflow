# validate_folders.py
"""
POD Workflow Directory Validator
--------------------------------
Ensures required folders exist under your 'design-workflow' root directory.
Auto-creates missing folders and logs results to logs/folder_check.log
Optimized for Windows environment.
"""

import os
from datetime import datetime

# --- CONFIGURE THIS PATH ---
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

# --- LOG SETUP ---
LOG_DIR = os.path.join(BASE_PATH, "logs")
LOG_FILE = os.path.join(LOG_DIR, "folder_check.log")
os.makedirs(LOG_DIR, exist_ok=True)

def log(message: str):
    """Append message to the log file with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def validate_structure():
    """Check and create folders as needed."""
    log("\n--- Folder Validation Started ---")
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

    log(f"\nSummary: {existing} existing | {created} created\n")
    log("--- Folder Validation Complete ---\n")

if __name__ == "__main__":
    validate_structure()
    input("\nPress Enter to exit...")
