import multer from "multer";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

const hasCloudinaryCreds = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

let storage;
if (hasCloudinaryCreds) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'farmer-platform',
      allowed_formats: ['jpg', 'jpeg', 'png']
    }
  });
} else {
  // Fallback to local disk storage for local development.
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${unique}${ext}`);
    }
  });
}

export const upload = multer({ storage });
