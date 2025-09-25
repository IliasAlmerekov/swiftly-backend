import cloudinary from "../config/cloudinary.js";
import User from "../models/userModel.js";
import fs from 'fs';

export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload in Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'avatars',
            width: 500,
            height: 500,
            crop: 'fill',
            format: 'jpg',
            quality: 'auto'
        });

        // Remove temporary file
        fs.unlinkSync(req.file.path);

        // Update user in database
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                avatar: {
                    public_id: result.public_id,
                    url: result.secure_url,
                },
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            user,
        });
    } catch (error) {
        // Remove temporary file in case of error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error removing temporary file:', unlinkError);
            }
        }
        console.error('Error uploading avatar:', error);
        res.status(500).json({
            message: 'Error uploading avatar',
            error: error.message 
        });
    }
};