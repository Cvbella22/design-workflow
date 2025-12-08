"""
POD Integrity Manager – unified validation, Git, and Firebase uploader
----------------------------------------------------------------------
Run this only inside your design-workflow folder.
"""

import os, json, hashlib, datetime, subprocess, requests
from dotenv import load_dotenv

# --- Firebase Admin SDK setup ---
from firebase_admin import credentials, storage, initialize_app

# Locate your service account JSON
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(BASE_PATH, "config", "serviceAccountKey.json")

# Initialize Firebase if the key exists
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    initialize_app(cred, {
        'storageBucket': 'sample-firebase-ai-app-55874.firebasestorage.app'
    })
    print("✅ Firebase initialized successfully.")
else:
    print("⚠️ Firebase serviceAccountKey.json not found in config/")

def upload_to_firebase(local_path, remote_path):
    """Uploads a file to Firebase Storage using Admin SDK."""
    try:
        bucket = storage.bucket()
        blob = bucket.blob(remote_path)
        blob.upload_from_filename(local_path)
        print(f"✅ Uploaded: {local_path} → gs://{bucket.name}/{remote_path}")
        return True
    except Exception as e:
        print(f"⚠️ Firebase upload failed for {local_path}: {e}")
        return False


# === CONFIG ===
load_dotenv()
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_PATH, "logs")
LOG_FILE = os.path.join(LOG_DIR, "folder_check.log")
MANIFEST_FILE = os.path.join(BASE_PATH, "integrity_manifest.json")
os.makedirs(LOG_DIR, exist_ok=True)

# Firebase configuration from .env
FIREBASE_BUCKET = os.getenv("FIREBASE_BUCKET_NAME")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
FIREBASE_URL = os.getenv("FIREBASE_STORAGE_URL")
GIT_REMOTE = os.getenv("GIT_REMOTE", "").strip()
AUTO_PUSH = os.getenv("AUTO_PUSH", "False").lower() == "true"

# Folders and files to verify
REQUIRED_FOLDERS = [
    "collections","config","designs","logs","metadata",
    "mockup_templates","mockups_output","node_modules",
    "psd_templates","scripts"
]
REQUIRED_FILES = [".env","package.json","package-lock.json"]

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] {msg}\n")

def sha256(file_path):
    h = hashlib.sha256()
    try:
        with open(file_path,"rb") as f:
            for chunk in iter(lambda:f.read(4096),b""):
                h.update(chunk)
        return h.hexdigest()
    except FileNotFoundError:
        return None

def validate_structure():
    existing, created = 0,0
    for folder in REQUIRED_FOLDERS:
        full = os.path.join(BASE_PATH,folder)
        if os.path.exists(full):
            existing+=1
            log(f"✅ Exists: {folder}")
        else:
            os.makedirs(full)
            created+=1
            log(f"🧱 Created: {folder}")
    log(f"Summary: {existing} existing | {created} created")

def validate_files():
    data={}
    for f in REQUIRED_FILES:
        path=os.path.join(BASE_PATH,f)
        if os.path.exists(path):
            h=sha256(path)
            data[f]=h
            log(f"✅ File found: {f}")
        else:
            log(f"⚠️ Missing: {f}")
    with open(MANIFEST_FILE,"w",encoding="utf-8") as m:
        json.dump(data,m,indent=4)
    return data

def firebase_upload():
    if not FIREBASE_URL or not FIREBASE_BUCKET:
        log("⚠️ Firebase not configured; skipping upload.")
        return
    for f in [LOG_FILE, MANIFEST_FILE]:
        if not os.path.exists(f): continue
        name=os.path.basename(f)
        url=f"{FIREBASE_URL}/o/{name}?uploadType=media&name={name}"
        headers={"Content-Type":"application/json"}
        try:
            with open(f,"rb") as up:
                r=requests.post(url,params={"key":FIREBASE_API_KEY},
                                data=up,headers=headers,timeout=30)
            log(f"☁️ Uploaded {name} to Firebase ({r.status_code})")
        except Exception as e:
            log(f"⚠️ Firebase upload failed: {e}")

def git_commit():
    try:
        if not os.path.exists(os.path.join(BASE_PATH,".git")):
            subprocess.run(["git","init"],cwd=BASE_PATH,check=True)
            log("🪄 Git repository initialized.")
            if GIT_REMOTE:
                subprocess.run(["git","remote","add","origin",GIT_REMOTE],
                               cwd=BASE_PATH,check=False)
        subprocess.run(["git","add","-A"],cwd=BASE_PATH)
        msg=f"[Auto-Commit] Validation {datetime.datetime.now():%Y-%m-%d %H:%M}"
        subprocess.run(["git","commit","-m",msg],cwd=BASE_PATH)
        if AUTO_PUSH and GIT_REMOTE:
            subprocess.run(["git","branch","-M","main"],cwd=BASE_PATH)
            subprocess.run(["git","push","-u","origin","main"],cwd=BASE_PATH)
            log("🚀 Pushed to GitHub.")
        else:
            log("💾 Commit created locally (push disabled).")
    except Exception as e:
        log(f"⚠️ Git step failed: {e}")

def main():
    log("\n=== POD Integrity Manager Run ===")
    validate_structure()
    validate_files()
    firebase_upload()
    git_commit()
    log("✅ Workflow complete.\n")

# --- Automatic Firebase Uploads ---
if AUTO_PUSH:  # Only upload when AUTO_PUSH=True in .env
    print("\n=== Uploading validation results to Firebase ===")

    # Paths to upload
    LOG_PATH = os.path.join(LOG_DIR, "folder_check.log")
    MANIFEST_PATH = MANIFEST_FILE
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    # Upload if they exist
    if os.path.exists(LOG_PATH):
        upload_to_firebase(LOG_PATH, f"logs/folder_check_{timestamp}.log")
    else:
        print("⚠️ Log file not found, skipping upload.")

    if os.path.exists(MANIFEST_PATH):
        upload_to_firebase(MANIFEST_PATH, f"metadata/integrity_manifest_{timestamp}.json")
    else:
        print("⚠️ Manifest file not found, skipping upload.")

    print("=== Firebase upload complete ===\n")
else:
    print("\n🕓 AUTO_PUSH is disabled. Skipping Firebase upload.")

if __name__ == "__main__":
    main()
    input("Press Enter to exit...")
