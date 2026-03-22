export const runtime = 'nodejs';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { hashPassword } from '@/lib/auth';

export async function POST(req) {
  const { username, password, recoveryAnswer } = await req.json();
  if (!username || !password) return fail(400, 'Логин и пароль обязательны');

  const db = await getDb();
  const exists = await db.collection('users').findOne({ username });
  if (exists) return fail(400, 'Пользователь уже есть');

  await db.collection('users').insertOne({
    username,
    passwordHash: hashPassword(password),
    recoveryAnswer: (recoveryAnswer || '').toLowerCase().trim(),
    avatar: '🤖',
    status: 'В сети',
    contacts: [],
    customEmojis: ['🔥', '✨', '🚀'],
    theme: 'matrix',
    opacity: 0.95
  });

  return ok();
}
