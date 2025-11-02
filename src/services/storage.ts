import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const s3Bucket = process.env.S3_BUCKET;
const s3Region = process.env.S3_REGION || "us-east-1";

let s3: S3Client | undefined;
if (s3Bucket) s3 = new S3Client({ region: s3Region });

// Local storage fallback for development
const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
	mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadBufferToS3(buffer: Buffer, mimeType: string): Promise<string> {
	// Try S3 first if configured
	if (s3 && s3Bucket) {
		try {
			const key = `uploads/${randomUUID()}`;
			await s3.send(
				new PutObjectCommand({
					Bucket: s3Bucket,
					Key: key,
					Body: buffer,
					ContentType: mimeType,
				})
			);
			return `s3://${s3Bucket}/${key}`;
		} catch (error) {
			console.warn("S3 upload failed, falling back to local storage:", error);
		}
	}
	
	// Fallback to local storage
	const fileName = `${randomUUID()}.${getFileExtension(mimeType)}`;
	const filePath = join(UPLOADS_DIR, fileName);
	
	writeFileSync(filePath, buffer);
	
	// Return a URL that can be served by the server
	return `/uploads/${fileName}`;
}

function getFileExtension(mimeType: string): string {
	const extensions: { [key: string]: string } = {
		'image/jpeg': 'jpg',
		'image/jpg': 'jpg',
		'image/png': 'png',
		'application/pdf': 'pdf'
	};
	return extensions[mimeType] || 'bin';
}


