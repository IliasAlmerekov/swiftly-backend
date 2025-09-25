import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getUser, getAllUsers, getUserProfile, updateUserProfile, getUserById, updateUserProfileById } from '../controllers/getUser.js';
import { setUserOnline, setUserOffline, updateUserActivity } from '../controllers/userStatusController.js';

const router = express.Router();

// Get all support users with online status
router.get('/support', authMiddleware, getUser);

// Get current user's profile
router.get('/profile', authMiddleware, getUserProfile);

// Get all users
router.get('/users', authMiddleware, getAllUsers);

// Get user profile by ID (admin only)
router.get('/:userId', authMiddleware, getUserById);

// Update user profile
router.put('/profile', authMiddleware, updateUserProfile);

// Update user profile by ID (admin only)
router.put('/:userId', authMiddleware, updateUserProfileById);

// Update user online status
router.put('/status/online', authMiddleware, setUserOnline);
router.put('/status/offline', authMiddleware, setUserOffline);
router.put('/status/activity', authMiddleware, updateUserActivity);

export default router;
