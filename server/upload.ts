import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit (evidencias NOM-035)
  },
});

// Upload endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Generate unique file key
    const folder = req.body.folder || "resources";
    const fileExtension = req.file.originalname.split(".").pop();
    const fileKey = `${folder}/${nanoid()}.${fileExtension}`;

    // Upload to S3
    const result = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

export default router;
