"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToS3 = uploadBufferToS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const s3Bucket = process.env.S3_BUCKET;
const s3Region = process.env.S3_REGION || "us-east-1";
let s3;
if (s3Bucket)
    s3 = new client_s3_1.S3Client({ region: s3Region });
// Local storage fallback for development
const UPLOADS_DIR = (0, path_1.join)(process.cwd(), 'uploads');
// Ensure uploads directory exists
if (!(0, fs_1.existsSync)(UPLOADS_DIR)) {
    (0, fs_1.mkdirSync)(UPLOADS_DIR, { recursive: true });
}
async function uploadBufferToS3(buffer, mimeType) {
    // Try S3 first if configured
    if (s3 && s3Bucket) {
        try {
            const key = `uploads/${(0, crypto_1.randomUUID)()}`;
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: s3Bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            }));
            return `s3://${s3Bucket}/${key}`;
        }
        catch (error) {
            console.warn("S3 upload failed, falling back to local storage:", error);
        }
    }
    // Fallback to local storage
    const fileName = `${(0, crypto_1.randomUUID)()}.${getFileExtension(mimeType)}`;
    const filePath = (0, path_1.join)(UPLOADS_DIR, fileName);
    (0, fs_1.writeFileSync)(filePath, buffer);
    // Return a URL that can be served by the server
    return `/uploads/${fileName}`;
}
function getFileExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'application/pdf': 'pdf'
    };
    return extensions[mimeType] || 'bin';
}
//# sourceMappingURL=storage.js.map