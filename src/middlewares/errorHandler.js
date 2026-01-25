export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const payload = {
        message: err.message || "Internal Server Error",
    };

    if (err.details) payload.details = err.details;
    if (process.env.NODE_ENV === "development") {
        payload.stack = err.stack;
    }

    res.status(status).json(payload);
};