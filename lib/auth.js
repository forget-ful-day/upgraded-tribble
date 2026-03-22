import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from './mongodb';

export const hashPassword = (p) => crypto.createHash('sha256').update(p).digest('hex');

export async function createSession(username) {
  const db = await getDb();
  const token = crypto.randomUUID();
  await db.collection('sessions').insertOne({ token, username, createdAt: new Date() });
  return token;
}

export async function getSessionUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('robochat_session')?.value;
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection('sessions').findOne({ token });
  if (!session) return null;

  return db.collection('users').findOne(
    { username: session.username },
    { projection: { passwordHash: 0, recoveryAnswer: 0 } }
  );
}

export async function clearSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('robochat_session')?.value;
  if (token) {
    const db = await getDb();
    await db.collection('sessions').deleteOne({ token });
  }
}
