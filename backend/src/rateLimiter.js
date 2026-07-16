export function createRateLimiter({ windowMs, max }) {
  const hitsByKey = new Map();

  return function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const recentHits = (hitsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recentHits.length >= max) {
      res.status(429).json({ error: "Too many messages. Please wait a moment before trying again." });
      return;
    }

    recentHits.push(now);
    hitsByKey.set(key, recentHits);
    next();
  };
}
