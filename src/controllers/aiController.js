import AIRequestLog from '../models/aiLogs.js';

export const getAIRequestsStats = async (req, res) => {
    try {
        const now = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);

        const stats = await AIRequestLog.aggregate([
            { $match: { createdAt: { $gte: monthAgo, $lte: now } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    ai_requests: { $sum: 1 }  
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    ai_requests: 1
                }
            },
            { $sort: {date: 1}}
        ]);
        res.status(200).json({
            stats
        });
                } catch (error) {
                    res.status(500).json({ error: error.message });
                }
            };