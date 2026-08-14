/** Montants et dates — un seul endroit, pour que tout l'écran parle la même langue. */

const chf = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
  maximumFractionDigits: 0,
});

export function montant(valeur: number | string | null | undefined): string {
  return chf.format(Number(valeur ?? 0));
}

/** Forme courte pour les axes de graphique et les cartes : 128k, 1.2M. */
export function montantCourt(valeur: number | string | null | undefined): string {
  const n = Number(valeur ?? 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

const jour = new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short' });
const jourAn = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

export function dateCourte(d: Date | string): string {
  return jour.format(new Date(d));
}

export function dateLongue(d: Date | string): string {
  return jourAn.format(new Date(d));
}

export function pourcent(valeur: number): string {
  return `${Math.round(valeur * 100)} %`;
}
