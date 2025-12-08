import os
import time
import subprocess
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# === CONFIG ===
BASE_PATH = os.path.abspath(os.path.dirname(__file__))
CHECK_INTERVAL = 3  # seconds between scans
LOG_FILE = os.path.join(BASE_PATH, "auto_sync.log")

GIT_REMOTE = "origin"
GIT_BRANCH = "main"

def log(msg):
    """Log to console and file."""
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")

def run_git_command(command):
    """Run a Git command and log output."""
    try:
        result = subprocess.run(command, shell=True, cwd=BASE_PATH, capture_output=True, text=True)
        if result.stdout:
            log(result.stdout.strip())
        if result.stderr:
            log(f"⚠️ {result.stderr.strip()}")
    except Exception as e:
        log(f"❌ Error running '{command}': {e}")

class GitAutoHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if event.is_directory:
            return

        # Remove index.lock if stuck
        lock_file = os.path.join(BASE_PATH, ".git", "index.lock")
        if os.path.exists(lock_file):
            try:
                os.remove(lock_file)
                log("🧹 Removed stale .git/index.lock")
            except Exception as e:
                log(f"⚠️ Could not remove lock: {e}")
                return

        # Auto sync changes
        log(f"📂 Detected change: {event.src_path}")
        self.auto_sync()

    def auto_sync(self):
        log("🔄 Starting Git auto-sync...")

        # Pull first (to avoid rejections)
        run_git_command(f"git pull --rebase {GIT_REMOTE} {GIT_BRANCH}")

        # Stage all changes
        run_git_command("git add .")

        # Commit with timestamp
        msg = f"Auto-sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        run_git_command(f'git commit -m "{msg}"')

        # Push to GitHub
        run_git_command(f"git push {GIT_REMOTE} {GIT_BRANCH}")

        log("✅ Sync complete.\n")

def main():
    log("🚀 Auto Git Watcher started.")
    log(f"📁 Watching folder: {BASE_PATH}")
    event_handler = GitAutoHandler()
    observer = Observer()
    observer.schedule(event_handler, BASE_PATH, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        log("🛑 Auto Git Watcher stopped.")
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
