import { OAuth2Client } from 'google-auth-library';

async function defaultVerifyIdToken(credential, clientId) {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  return ticket.getPayload();
}

export async function verifyGoogleToken(credential, { verifyIdToken = defaultVerifyIdToken } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');

  const payload = await verifyIdToken(credential, clientId);
  if (!payload?.sub || !payload?.email) {
    throw new Error('Google token payload is missing required fields');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    pictureUrl: payload.picture ?? null,
  };
}
