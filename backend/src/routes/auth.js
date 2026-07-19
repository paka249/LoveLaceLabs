import { randomUUID } from 'node:crypto';
import { verifyGoogleToken } from '../auth/verifyGoogleToken.js';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  verifySessionToken,
} from '../auth/session.js';

async function findOrCreateUser(db, profile) {
  const existing = await db('users').where({ google_id: profile.googleId }).first();
  if (existing) return existing;

  const user = {
    id: randomUUID(),
    google_id: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture_url: profile.pictureUrl,
  };
  await db('users').insert(user);
  return user;
}

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, pictureUrl: user.picture_url };
}

export function createGoogleLoginHandler({ db, verify = verifyGoogleToken }) {
  return async function googleLoginHandler(req, res) {
    const { credential } = req.body ?? {};
    if (typeof credential !== 'string' || !credential) {
      res.status(400).json({ error: 'Request must include a "credential" (Google ID token).' });
      return;
    }

    let profile;
    try {
      profile = await verify(credential);
    } catch (err) {
      console.error('Google token verification failed:', err);
      res.status(401).json({ error: "Couldn't verify that Google sign-in, try again." });
      return;
    }

    try {
      const user = await findOrCreateUser(db, profile);
      const token = createSessionToken(user.id);
      setSessionCookie(res, token);
      res.json(toPublicUser(user));
    } catch (err) {
      console.error('Error while creating session for Google sign-in:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Something went wrong while signing you in.' });
      }
    }
  };
}

export function createMeHandler({ db }) {
  return async function meHandler(req, res) {
    const token = getSessionToken(req);
    const userId = token ? verifySessionToken(token) : null;
    if (!userId) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }

    try {
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        res.status(401).json({ error: 'Not signed in.' });
        return;
      }

      res.json(toPublicUser(user));
    } catch (err) {
      console.error('Error while looking up session user:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Something went wrong while checking your session.' });
      }
    }
  };
}

export function createLogoutHandler() {
  return function logoutHandler(req, res) {
    clearSessionCookie(res);
    res.status(204).end();
  };
}
