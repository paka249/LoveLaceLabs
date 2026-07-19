import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

export function createSessionToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '7d' });
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.sub;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function getSessionToken(req) {
  return req.cookies?.[COOKIE_NAME] ?? null;
}
