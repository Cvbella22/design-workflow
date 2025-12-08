import os
import time
import subprocess
from datetime import datetime


# === Configuration ===
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
GIT_REMOTE = "origin"
GIT_BRANCH = "main"
LOG_FILE = os.path.join(BASE_PATH, "auto_sync.log")


# === Utility Functions ===
def log(message: str):
    """Print and save log messages with timestamps."""
    timestamp = datetime.now().strftime("[%Y-%m-%d %H:%M:%S]")
    formatted = f"{timestamp} {message}"
    print(formatted)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(formatted + "\n")


def run_git_command(cmd):
    """Run a Git command and return the completed process."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            log(f"⚠️ Git error: {result.stderr.strip()}")
        else:
            log(f"✅ Git success: {cmd}")
        return result
    except Exception as e:
        log(f"❌ Exception while running '{cmd}': {e}")
        return None


# === Main Sync Logic ===
def auto_sync():
    log("🔁 Starting Git auto-sync watcher...")

    lock_file = os.path.join(BASE_PATH, ".git", "index.lock")
    retry_interval = 600  # 10 minutes
    max_waits = 6         # 30 seconds before force removal (6 × 5s)

    while True:
        # --- Step 1: Wait for .git/index.lock to be cleared ---
        wait_count = 0
        while os.path.exists(lock_file):
            wait_count += 1
            log(f"🟠 Detected .git/index.lock (attempt {wait_count}) — waiting 5 seconds...")
            time.sleep(5)

            if wait_count >= max_waits:
                try:
                    os.remove(lock_file)
                    log("🟢 Removed stale .git/index.lock after timeout.")
                    break
                except Exception as e:
                    log(f"⚠️ Could not remove lock automatically: {e}")
                    time.sleep(retry_interval)
                    continue

        # --- Step 2: Pull latest changes from remote ---
        pull = run_git_command(f"git pull --rebase {GIT_REMOTE} {GIT_BRANCH}")
        if not pull or pull.returncode != 0:
            log("🔴 Pull failed — attempting recovery...")
            run_git_command("git fetch --all")
            retry_pull = run_git_command(f"git reset --hard {GIT_REMOTE}/{GIT_BRANCH}")
            if not retry_pull or retry_pull.returncode != 0:
                log("⚠️ Recovery pull failed. Retrying in 10 minutes...")
                time.sleep(retry_interval)
                continue

        # --- Step 3: Stage, commit, and push changes ---
        run_git_command("git add .")
        msg = f"Auto-sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        commit = run_git_command(f'git commit -m "{msg}"')
        push = run_git_command(f"git push {GIT_REMOTE} {GIT_BRANCH}")

        if push and push.returncode == 0:
            log("✅ Successfully synced with GitHub.")
        else:
            log("⚠️ Push failed — will retry in 10 minutes.")

        # Wait before the next sync cycle
        time.sleep(retry_interval)


# === Entry Point ===
if __name__ == "__main__":
    try:
        auto_sync()
    except KeyboardInterrupt:
        log("🛑 Auto-sync watcher stopped manually.")
