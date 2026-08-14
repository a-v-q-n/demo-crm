import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const root = path.dirname(fileURLToPath(import.meta.url));

// Sortie standalone pour l'image Docker. Les paquets serveur lourds ou natifs (pg, better-auth,
// drizzle) restent des require() Node : le bundling webpack casse sur leurs particularités.
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: root,
  serverExternalPackages: ['better-auth', 'drizzle-orm', 'pg'],
  // Les migrations drizzle sont lues au boot (instrumentation.ts) : fichiers hors graphe de
  // modules, à tracer explicitement dans le standalone.
  outputFileTracingIncludes: {
    '**': ['./drizzle/**/*'],
  },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
