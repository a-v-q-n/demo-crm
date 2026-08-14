import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Formulaire } from './formulaire';

// Écran de connexion, hors du groupe (app) : pas de navigation latérale ici, le cadre plein
// écran est posé directement. Une session existante saute droit au dashboard.
export default async function PageLogin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/dashboard');

  return (
    <div className="flex h-full items-center justify-center overflow-hidden px-5">
      <Formulaire />
    </div>
  );
}
