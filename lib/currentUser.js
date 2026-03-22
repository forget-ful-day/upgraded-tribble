import { getSessionUser } from './auth';
import { fail } from './http';

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { error: fail(401, 'Не авторизован') };
  return { user };
}
