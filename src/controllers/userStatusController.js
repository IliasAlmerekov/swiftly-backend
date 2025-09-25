import User from '../models/userModel.js';

// Set user online status
export const setUserOnline = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware
        
        await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date()
        });

        res.json({ message: 'User status updated to online' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Set user offline status
export const setUserOffline = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware
        
        await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
        });

        res.json({ message: 'User status updated to offline' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user activity (heartbeat)
export const updateUserActivity = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware
        
        await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date()
        });

        res.json({ message: 'User activity updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Utility function to mark users offline if they haven't been seen for a while
export const markInactiveUsersOffline = async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
        
        await User.updateMany(
            { 
                isOnline: true,
                lastSeen: { $lt: fiveMinutesAgo }
            },
            { 
                isOnline: false 
            }
        );
        
        console.log('Inactive users marked offline');
    } catch (error) {
        console.error('Error marking inactive users offline:', error);
    }
};
