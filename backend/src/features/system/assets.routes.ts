import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { DATA_PATHS } from '../../constants';
import { verifyToken } from '../../middleware/authMiddleware';
import { auditService } from './AuditService';

const router = express.Router();

// Configure storage for backgrounds
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DATA_PATHS.BACKGROUNDS_UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `background-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        
        if (ext && mime) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, webp, gif)'));
    }
});

router.post('/background', verifyToken, upload.single('file'), async (req, res) => {
    console.log('[Assets] POST /background received');
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = (req as any).user;
        const publicUrl = `/uploads/backgrounds/${req.file.filename}`;
        
        auditService.log(user.id, 'ASSET_UPLOAD', 'BACKGROUND', { filename: req.file.filename }, req.ip, user.email);
        
        res.json({ url: publicUrl });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
