'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bouton, Carte, Champ, Etiquette } from '@/components/ui/primitives';
import { signIn } from '@/lib/auth-client';

// Carte de connexion : la démo est publique, ses identifiants sont diffusés — le rappel en
// pied de carte est volontaire, pas un oubli.
export function Formulaire() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function connecter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const { error } = await signIn.email({ email, password: motDePasse });
      if (error) {
        setErreur(error.message ?? 'Identifiants incorrects.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErreur('Connexion impossible. Réessaie.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="relative flex w-full max-w-[320px] justify-center">
      {/* Halo néon discret derrière la carte, purement décoratif. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 -z-10"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,61,138,0.16), rgba(47,240,155,0.07) 55%, transparent 78%)',
        }}
      />

      <Carte className="w-full p-6">
        <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-2">
            <span className="glow-rose h-2 w-2 shrink-0 rounded-full bg-rose" />
            <span className="text-[15px] font-semibold tracking-[0.16em] text-texte uppercase">
              Demo<span className="text-rose">CRM</span>
            </span>
          </div>
          <p className="text-xs text-atone">Connecte-toi pour piloter le pipeline.</p>
        </div>

        <form onSubmit={connecter} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Etiquette>Email</Etiquette>
            <Champ
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evenement) => setEmail(evenement.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Etiquette>Mot de passe</Etiquette>
            <Champ
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
            />
          </div>

          <Bouton ton="rose" className="mt-1 w-full" type="submit" disabled={enCours}>
            {enCours ? 'Connexion…' : 'Se connecter'}
          </Bouton>

          {erreur != null && <p className="text-xs text-rose">{erreur}</p>}
        </form>

        <div className="mt-5 flex flex-col gap-1 rounded-md border border-bord bg-surface-2 px-3 py-2.5">
          <Etiquette>Compte de démonstration</Etiquette>
          <p className="chiffres text-xs text-atone-fort">
            hello@avqn.ch <span className="text-atone">/</span> 123456
          </p>
        </div>
      </Carte>
    </div>
  );
}
