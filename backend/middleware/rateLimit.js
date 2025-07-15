// Simple rate limiting middleware for Express
const rateLimit = new Map();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // requests per window
const CLEANUP_INTERVAL = 5 * 60 * 1000; // cleanup every 5 minutes

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimit.entries()) {
        if (now - data.resetTime > RATE_LIMIT_WINDOW) {
            rateLimit.delete(key);
        }
    }
}, CLEANUP_INTERVAL);

function rateLimiter(req, res, next) {
    // Get client IP
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit entry for this IP
    let rateLimitData = rateLimit.get(clientIP);
    
    if (!rateLimitData) {
        // First request from this IP
        rateLimit.set(clientIP, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        });
        return next();
    }
    
    // Check if window has expired
    if (now > rateLimitData.resetTime) {
        // Reset the counter
        rateLimitData.count = 1;
        rateLimitData.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    // Check if limit exceeded
    if (rateLimitData.count >= MAX_REQUESTS) {
        console.warn(`🚫 Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please wait a moment before trying again.',
            retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
        });
    }
    
    // Increment counter
    rateLimitData.count++;
    
    // Add rate limit headers
    res.set({
        'X-RateLimit-Limit': MAX_REQUESTS,
        'X-RateLimit-Remaining': MAX_REQUESTS - rateLimitData.count,
        'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
    });
    
    next();
}

module.exports = rateLimiter;
