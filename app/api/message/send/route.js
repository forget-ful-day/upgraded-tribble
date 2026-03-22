import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { chatId, text, kind } = await req.json();

  const db = await getDb();
  const chat = await db.collection('chats').findOne({ _id: new ObjectId(chatId), participants: auth.user.username });
  if (!chat) return fail(404, 'Чат не найден');

  const message = {
    id: crypto.randomUUID(),
    sender: auth.user.username,
    text,
    kind: kind || 'text',
    ts: Date.now(),
    pinned: false,
    reactions: {}
  };

  await db.collection('chats').updateOne({ _id: chat._id }, { $push: { messages: message } });
  return ok();
}
