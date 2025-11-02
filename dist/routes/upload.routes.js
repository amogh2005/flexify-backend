"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const storage_1 = require("../services/storage");
const Provider_1 = require("../models/Provider");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)();
// Public document upload for registration (no auth required)
router.post("/document", upload.single("file"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "Missing file" });
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
        const url = await (0, storage_1.uploadBufferToS3)(req.file.buffer, req.file.mimetype);
        return res.json({
            url,
            message: "File uploaded successfully",
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype
        });
    }
    catch (e) {
        console.error("Upload error:", e);
        return res.status(500).json({ error: e.message || "Upload failed" });
    }
});
// Provider: upload ID document (image/pdf) for verification
router.post("/id", auth_1.verifyJwt, (0, auth_1.requireRole)("provider"), upload.single("file"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "Missing file" });
    try {
        const url = await (0, storage_1.uploadBufferToS3)(req.file.buffer, req.file.mimetype);
        const doc = await Provider_1.ProviderModel.findOneAndUpdate({ userId: req.user.userId }, { idDocumentUrl: url }, { new: true });
        return res.json({ url, provider: doc });
    }
    catch (e) {
        return res.status(500).json({ error: e.message || "Upload failed" });
    }
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map