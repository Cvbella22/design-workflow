import os
import time
import subprocess
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from win10toast import ToastNotifier  # for Windows notifications

# === CONFIG ===
BASE_PATH = os.path.abspath(os.path.dirname(__file__))
CHECK_INTERVAL = 3  # seconds between scans
LOG_FILE = os.path.join(BASE_PATH, "auto_sync.log")

GIT_REMOTE = "origin"
GIT_BRANCH = "main"

# Initialize notifier
toaster = ToastNotifier()

def log(msg):
    """Log to console and file."""
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")

def notify(title, message):
    """Send a Windows toast notification."""
    try:
        toaster.show_toast(
            title,
            message,
            duration=5,
            icon_path=None,
            threaded=True
        )
    except Exception as e:
        log(f"⚠️ Notification failed: {e}")

def run_git_command(command):
    """Run a Git command and log output."""
    try:
        result = subprocess.run(command, shell=True, cwd=BASE_PATH, capture_output=True, text=True)
        if result.stdout:
            log(result.stdout.strip())
        if result.stderr:
            log(f"⚠️ {result.stderr.strip()}")
        return result
    except Exception as e:
        log(f"❌ Error running '{command}': {e}")
        return None

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
        pull = run_git_command(f"git pull --rebase {GIT_REMOTE} {GIT_BRANCH}")
        if pull and pull.returncode != 0:
            notify("⚠️ Git Sync Warning", "Pull failed. Manual attention may be required.")
            return

        # Stage all changes
        run_git_command("git add .")

        # Commit with timestamp
        msg = f"Auto-sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        commit = run_git_command(f'git commit -m "{msg}"')

        # Only push if there’s something to commit
        if commit and "nothing to commit" in commit.stdout.lower():
            return

        # Push to GitHub
        push = run_git_command(f"git push {GIT_REMOTE} {GIT_BRANCH}")

        if push and push.returncode == 0:
            log("✅ Sync complete.\n")
            notify("✅ Git Sync Completed", "Auto-sync pushed changes to GitHub successfully.")
        else:
            notify("❌ Git Sync Failed", "Push failed. Check auto_sync.log for details.")

def main():
    log("🚀 Auto Git Watcher started.")
    log(f"📁 Watching folder: {BASE_PATH}")
    event_handler = GitAutoHandler()
    observer = Observer()
    observer.schedule(event_handler, BASE_PATH, recursive=True)
    observer.start()
    notify("🚀 Git AutoSync Running", "Now watching for file changes...")

    try:
        while True:
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        log("🛑 Auto Git Watcher stopped.")
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
