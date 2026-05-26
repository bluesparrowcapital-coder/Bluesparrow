import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'distributor');
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, WEBP and PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const distributorClientUpload = upload.fields([
  { name: 'panDocument', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'photoDocument', maxCount: 1 },
  { name: 'signatureDocument', maxCount: 1 },
  { name: 'bankProofDocument', maxCount: 1 },
]);