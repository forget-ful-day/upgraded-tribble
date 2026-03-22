export const runtime = 'nodejs';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { chatId, messageId, emoji } = await req.json();

  const db = await getDb();
  const chat = await db.collection('chats').findOne({ _id: new ObjectId(chatId), participants: auth.user.username });
  if (!chat) return fail(404, 'Чат не найден');

  const messages = (chat.messages || []).map(m => {
    if (m.id !== messageId) return m;
    const users = new Set(m.reactions?.[emoji] || []);
    users.has(auth.user.username) ? users.delete(auth.user.username) : users.add(auth.user.username);
    return { ...m, reactions: { ...(m.reactions || {}), [emoji]: Array.from(users) } };
  });

  await db.collection('chats').updateOne({ _id: chat._id }, { $set: { messages } });
  return ok();
}
