import { Router } from "express";
import multer from "multer";
import { verifyJwt, requireRole } from "../middleware/auth";
import { uploadBufferToS3 } from "../services/storage";
import { ProviderModel } from "../models/Provider";

const router = Router();
const upload = multer();

// Public document upload for registration (no auth required)
router.post(
	"/document",
	upload.single("file"),
	async (req, res) => {
		if (!req.file) return res.status(400).json({ error: "Missing file" });
		
		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
		if (!allowedTypes.includes(req.file.mimetype)) {
			return res.status(400).json({ error: "Invalid file type. Only JPG, PNG, and PDF files are allowed." });
		}
		
		// Validate file size (5MB max)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (req.file.size > maxSize) {
			return res.status(400).json({ error: "File size must be less than 5MB" });
		}
		
		try {
			const url = await uploadBufferToS3(req.file.buffer, req.file.mimetype);
			return res.json({ 
				url, 
				message: "File uploaded successfully",
				fileName: req.file.originalname,
				fileSize: req.file.size,
				fileType: req.file.mimetype
			});
		} catch (e: any) {
			console.error("Upload error:", e);
			return res.status(500).json({ error: e.message || "Upload failed" });
		}
	}
);

// Provider: upload ID document (image/pdf) for verification
router.post(
	"/id",
	verifyJwt,
	requireRole("provider"),
	upload.single("file"),
	async (req, res) => {
		if (!req.file) return res.status(400).json({ error: "Missing file" });
		try {
			const url = await uploadBufferToS3(req.file.buffer, req.file.mimetype);
			const doc = await ProviderModel.findOneAndUpdate(
				{ userId: req.user!.userId },
				{ idDocumentUrl: url },
				{ new: true }
			);
			return res.json({ url, provider: doc });
		} catch (e: any) {
			return res.status(500).json({ error: e.message || "Upload failed" });
		}
	}
);

export default router;


