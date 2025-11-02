import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import { verifyJwt, requireRole } from "../middleware/auth.js";
import { ProviderModel } from "../models/Provider.js";

dotenv.config();

const router = express.Router();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Configure multer to use Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "flexify_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  },
});

const upload = multer({ storage });

// ✅ Public document upload (for registration, no auth needed)
router.post("/document", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file" });

    res.json({
      url: req.file.path, // ✅ Cloudinary returns this public URL
      message: "File uploaded successfully",
      fileName: req.file.originalname,
    });
  } catch (e) {
    console.error("Cloudinary Upload Error:", e);
    res.status(500).json({ error: e.message || "Upload failed" });
  }
});

// ✅ Provider authenticated upload
router.post("/id", verifyJwt, requireRole("provider"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file" });

    const url = req.file.path;

    const doc = await ProviderModel.findOneAndUpdate(
      { userId: req.user.userId },
      { idDocumentUrl: url },
      { new: true }
    );

    res.json({ url, provider: doc });
  } catch (e) {
    console.error("Cloudinary Upload Error:", e);
    res.status(500).json({ error: e.message || "Upload failed" });
  }
});

export default router;
