import { getDb } from '@/lib/mongodb';
import { ok } from '@/lib/http';
import { requireUser } from '@/lib/currentUser';

export async function GET(req) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get('q') || '';
  const db = await getDb();
  const groups = await db.collection('groups').find({ name: { $regex: q, $options: 'i' } }).toArray();
  return ok({ groups: groups.map(g => ({ ...g, _id: String(g._id) })) });
}
