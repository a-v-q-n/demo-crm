import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/** Garde des server actions : toute mutation exige une session. */
export async function exigerSession(): Promise<{ userId: string; email: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('non authentifié');
  return { userId: session.user.id, email: session.user.email };
}
