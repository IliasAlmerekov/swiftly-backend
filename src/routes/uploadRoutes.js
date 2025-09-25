import express from 'express';
import { uploadAvatar } from '../controllers/cloudUpload.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Route to upload user avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

export default router;