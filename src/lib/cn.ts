/** Concatène des classes conditionnelles. Assez pour ce projet — pas de tailwind-merge. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
