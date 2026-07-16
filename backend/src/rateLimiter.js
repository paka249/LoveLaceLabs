export function createRateLimiter({ windowMs, max }) {
  const hitsByKey = new Map();

  function sweep() {
    const now = Date.now();
    for (const [key, timestamps] of hitsByKey) {
      const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);
      if (recent.length === 0) {
        hitsByKey.delete(key);
      } else {
        hitsByKey.set(key, recent);
      }
    }
  }

  const sweepTimer = setInterval(sweep, windowMs);
  sweepTimer.unref?.();

  function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const recentHits = (hitsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recentHits.length >= max) {
      hitsByKey.set(key, recentHits);
      res.status(429).json({ error: "Too many messages. Please wait a moment before trying again." });
      return;
    }

    recentHits.push(now);
    hitsByKey.set(key, recentHits);
    next();
  }

  rateLimiter.size = () => hitsByKey.size;
  rateLimiter.stop = () => clearInterval(sweepTimer);

  return rateLimiter;
}
