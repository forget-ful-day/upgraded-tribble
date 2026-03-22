import { getDb } from '@/lib/mongodb';
import { ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const db = await getDb();
  const me = await db.collection('users').findOne({ username: auth.user.username }, { projection: { passwordHash: 0, recoveryAnswer: 0 } });
  const chats = await db.collection('chats').find({ participants: me.username }).toArray();
  const groups = await db.collection('groups').find({}).toArray();
  const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
  const meta = (await db.collection('meta').findOne({ key: 'app' })) || { version: '3.0.0', changelog: ['3.0.0: Next.js + Vercel MongoDB'] };

  return ok({
    me: { ...me, _id: String(me._id) },
    chats: chats.map(c => ({ ...c, _id: String(c._id) })),
    groups: groups.map(g => ({ ...g, _id: String(g._id) })),
    publicUsers: users.map(u => u.username).filter(u => u !== me.username),
    meta
  });
}
