import os
from firebase_admin import credentials, storage, initialize_app

BASE_PATH = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(BASE_PATH, "config", "serviceAccountKey.json")

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    app = initialize_app(cred, {
        'storageBucket': 'sample-firebase-ai-app-55874.firebasestorage.app'
    })
    print("✅ Firebase initialized successfully.")

    # Try listing files in your Firebase bucket
    bucket = storage.bucket()
    blobs = list(bucket.list_blobs())

    if blobs:
        print(f"✅ Connected! Found {len(blobs)} files in your bucket.")
        for b in blobs[:5]:
            print(f" - {b.name}")
    else:
        print("✅ Connected, but your Firebase bucket is currently empty.")
else:
    print("⚠️ serviceAccountKey.json not found in config/")
