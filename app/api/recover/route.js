import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { hashPassword } from '@/lib/auth';

export async function POST(req) {
  const { username, recoveryAnswer, newPassword } = await req.json();
  const db = await getDb();
  const user = await db.collection('users').findOne({ username });
  if (!user) return fail(404, 'Пользователь не найден');
  if (user.recoveryAnswer !== (recoveryAnswer || '').toLowerCase().trim()) return fail(400, 'Неверный ответ');

  await db.collection('users').updateOne({ username }, { $set: { passwordHash: hashPassword(newPassword) } });
  return ok();
}
