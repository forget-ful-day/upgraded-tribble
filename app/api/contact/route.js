import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { username } = await req.json();
  const db = await getDb();
  const other = await db.collection('users').findOne({ username });
  if (!other) return fail(404, 'Пользователь не найден');

  await db.collection('users').updateOne({ username: auth.user.username }, { $addToSet: { contacts: username } });

  const pair = [auth.user.username, username].sort();
  const exists = await db.collection('chats').findOne({ type: 'private', participants: pair });
  if (!exists) {
    await db.collection('chats').insertOne({
      name: `${pair[0]} и ${pair[1]}`,
      type: 'private',
      avatar: '💬',
      participants: pair,
      messages: []
    });
  }

  return ok();
}
