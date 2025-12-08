import os
import time
import datetime
from pathlib import Path
from dotenv import load_dotenv
from git import Repo
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import firebase_admin
from firebase_admin import credentials, storage

# === CONFIG ===
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_PATH, ".env"))

GIT_REMOTE = os.getenv("GIT_REMOTE", "").strip()
AUTO_PUSH = os.getenv("AUTO_PUSH", "true").lower() == "true"
CHECK_INTERVAL = 2  # seconds between file checks

# === Firebase Setup ===
cred_path = os.path.join(BASE_PATH, "config", "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': '<your-bucket-name>.appspot.com'  # Replace with your real bucket
    })
    print("✅ Firebase initialized.")
else:
    print("⚠️ Firebase serviceAccountKey.json not found in config folder.")


# === Git Auto Handler ===
class GitAutoHandler(FileSystemEventHandler):
    def __init__(self, repo):
        self.repo = repo
        self.last_commit_time = 0

    def on_any_event(self, event):
        if event.is_directory:
            return

        # Avoid flooding commits
        now = time.time()
        if now - self.last_commit_time < CHECK_INTERVAL:
            return
        self.last_commit_time = now

        # Prevent conflicts from another running git process
        lock_file = Path(BASE_PATH) / ".git" / "index.lock"
        if lock_file.exists():
            print("⚠️ Git lock detected — skipping this cycle.")
            return

        try:
            # Stage and commit all changes
            self.repo.git.add(A=True)
            msg = f"[AutoSync] {datetime.datetime.now():%Y-%m-%d %H:%M:%S}"
            self.repo.index.commit(msg)
            print(f"✅ Committed change: {event.src_path}")

            # Push if enabled
            if AUTO_PUSH:
                self.repo.git.push("origin", "main")
                print("🚀 Pushed to GitHub.")

            # Optional: Upload logs to Firebase
            log_path = os.path.join(BASE_PATH, "logs", "folder_check.log")
            if os.path.exists(log_path):
                bucket = storage.bucket('sample-firebase-ai-app-55874.appspot.com')
                blob = bucket.blob(f"logs/{os.path.basename(log_path)}")
                blob.upload_from_filename(log_path)
                print("☁️ Logs uploaded to Firebase.")

        except Exception as e:
            print(f"⚠️ Git operation failed: {e}")


# === MAIN LOOP ===
def main():
    print("🔁 Watching for file changes...")
    repo = Repo(BASE_PATH)
    event_handler = GitAutoHandler(repo)
    observer = Observer()
    observer.schedule(event_handler, BASE_PATH, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()


if __name__ == "__main__":
    main()
