import { getSessionToken, verifySessionToken } from './session.js';

export function requireAuth(req, res, next) {
  const token = getSessionToken(req);
  const userId = token ? verifySessionToken(token) : null;

  if (!userId) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  req.userId = userId;
  next();
}
