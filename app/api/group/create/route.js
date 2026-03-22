export const runtime = 'nodejs';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { name, isPrivate, code, avatar } = await req.json();

  const db = await getDb();
  const exists = await db.collection('groups').findOne({ name });
  if (exists) return fail(400, 'Группа уже существует');

  const group = await db.collection('groups').insertOne({
    name,
    owner: auth.user.username,
    isPrivate: !!isPrivate,
    code: isPrivate ? (code || '') : '',
    avatar: avatar || '👥',
    members: [auth.user.username]
  });

  await db.collection('chats').insertOne({
    name,
    type: 'group',
    avatar: avatar || '👥',
    groupId: String(group.insertedId),
    participants: [auth.user.username],
    messages: []
  });

  return ok();
}
