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

  const target = (chat.messages || []).find(m => m.id === messageId);
  if (!target || target.sender !== auth.user.username) return fail(403, 'Нельзя удалить');

  const messages = (chat.messages || []).map(m => m.id === messageId ? { ...m, text: '[Сообщение удалено]' } : m);
  await db.collection('chats').updateOne({ _id: chat._id }, { $set: { messages } });
  return ok();
}
