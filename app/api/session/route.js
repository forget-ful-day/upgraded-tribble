import { ok } from '@/lib/http';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  return ok({ username: user?.username || null });
}
