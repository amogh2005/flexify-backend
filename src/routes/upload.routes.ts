import { Router } from "express";
import multer from "multer";
import { verifyJwt, requireRole } from "../middleware/auth";
import { ProviderModel } from "../models/Provider";
// @ts-ignore
import cloudinary from "../config/cloudinary";


const router = Router();
const upload = multer();

// Public upload route (no auth required)
router.post("/document", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file" });
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "flexify_uploads", resource_type: "auto", access_mode: "public" },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      message: "File uploaded successfully",
    });
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// Authenticated provider upload (requires JWT)
router.post("/id", verifyJwt, requireRole("provider"), upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file" });
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "id_documents", resource_type: "auto" },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    const updated = await ProviderModel.findOneAndUpdate(
      { userId: req.user!.userId },
      { idDocumentUrl: result.secure_url },
      { new: true }
    );

    res.json({ url: result.secure_url, provider: updated });
  } catch (err: any) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
