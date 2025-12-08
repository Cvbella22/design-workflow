// firebase_upload_test.js
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "../.env") });

const credPath = path.join(__dirname, "../config/serviceAccountKey.json");
const bucketName = "sample-firebase-ai-app-55874.firebasestorage.app";
const localFile = path.join(__dirname, "../mockups_output/test_upload.txt");
const remotePath = "test/test_upload.txt";

console.log("🔍 Checking setup...");
console.log("Bucket:", bucketName);
console.log("Credential file exists?", fs.existsSync(credPath));
console.log("Test file exists?", fs.existsSync(localFile));

if (!fs.existsSync(localFile)) {
  console.error("❌ Test file missing! Please create mockups_output/test_upload.txt first.");
  process.exit(1);
}

try {
  const serviceAccount = require(credPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "sample-firebase-ai-app-55874.firebasestorage.app"
  });

  const bucket = admin.storage().bucket();

  console.log("🚀 Uploading file...");
  bucket.upload(localFile, { destination: remotePath })
    .then(() => {
      console.log("✅ File uploaded successfully!");
      const file = bucket.file(remotePath);
      return file.makePublic();
    })
    .then(() => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${remotePath}`;
      console.log("🔗 Public URL:", publicUrl);
    })
    .catch(err => {
      console.error("❌ Upload error:", err.message);
    });

} catch (err) {
  console.error("❌ Firebase setup failed:", err.message);
}
