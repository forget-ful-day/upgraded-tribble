import { getDb } from '@/lib/mongodb';
import { fail, ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';
import { clearSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { avatar, status, theme, opacity, customEmoji, deleteAccount } = await req.json();

  const db = await getDb();

  if (deleteAccount) {
    await db.collection('users').deleteOne({ username: auth.user.username });
    await db.collection('chats').updateMany({}, { $pull: { participants: auth.user.username } });
    await db.collection('groups').updateMany({}, { $pull: { members: auth.user.username } });
    await clearSession();
    cookies().set('robochat_session', '', { path: '/', maxAge: 0 });
    return ok({ deleted: true });
  }

  const set = {};
  if (avatar !== undefined) set.avatar = avatar || '🤖';
  if (status !== undefined) set.status = status || 'В сети';
  if (theme !== undefined) set.theme = theme;
  if (opacity !== undefined) set.opacity = Number(opacity);

  if (Object.keys(set).length) {
    await db.collection('users').updateOne({ username: auth.user.username }, { $set: set });
  }
  if (customEmoji) {
    await db.collection('users').updateOne({ username: auth.user.username }, { $addToSet: { customEmojis: customEmoji } });
  }

  return ok();
}
