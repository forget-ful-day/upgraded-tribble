import { ok } from '@/lib/http';
import { clearSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  await clearSession();
  cookies().set('robochat_session', '', { path: '/', maxAge: 0 });
  return ok();
}
