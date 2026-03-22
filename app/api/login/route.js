export const runtime = 'nodejs';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { createSession, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  const { username, password } = await req.json();
  const db = await getDb();
  const user = await db.collection('users').findOne({ username });
  if (!user || user.passwordHash !== hashPassword(password)) return fail(400, 'Неверный логин или пароль');

  const token = await createSession(username);
  cookies().set('robochat_session', token, { httpOnly: true, sameSite: 'lax', path: '/' });
  return ok({ username });
}
