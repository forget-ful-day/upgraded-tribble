export const runtime = 'nodejs';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { chatId, messageId } = await req.json();

  const db = await getDb();
  const chat = await db.collection('chats').findOne({ _id: new ObjectId(chatId), participants: auth.user.username });
  if (!chat) return fail(404, 'Чат не найден');

  const messages = (chat.messages || []).map(m => ({ ...m, pinned: m.id === messageId }));
  await db.collection('chats').updateOne({ _id: chat._id }, { $set: { messages } });
  return ok();
}
