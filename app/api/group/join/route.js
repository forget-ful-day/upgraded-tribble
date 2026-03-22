import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { groupId, code } = await req.json();

  const db = await getDb();
  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId) });
  if (!group) return fail(404, 'Группа не найдена');
  if (group.isPrivate && group.code !== (code || '')) return fail(400, 'Неверный код');

  await db.collection('groups').updateOne({ _id: group._id }, { $addToSet: { members: auth.user.username } });
  await db.collection('chats').updateOne({ groupId: String(group._id) }, { $addToSet: { participants: auth.user.username } });
  return ok();
}
