/**
 * Module d'optimisation des performances
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PerfOptimizationResult {
  applied: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Applique toutes les optimisations de performance
 */
export async function applyPerfOptimizations(
  workDir: string
): Promise<PerfOptimizationResult> {
  const result: PerfOptimizationResult = {
    applied: [],
    skipped: [],
    errors: [],
  };

  console.log('🚀 Application des optimisations de performance...');

  // 1. Configuration Next.js pour production
  await optimizeNextConfig(workDir, result);

  // 2. Optimisation des images
  await optimizeImages(workDir, result);

  // 3. Optimisation des fonts
  await optimizeFonts(workDir, result);

  // 4. Configuration du cache et headers
  await optimizeCacheHeaders(workDir, result);

  // 5. Minification et tree-shaking
  await optimizeBundle(workDir, result);

  // 6. Lazy loading et code splitting
  await optimizeCodeSplitting(workDir, result);

  // 7. Purge CSS inutilisé
  await purgeCss(workDir, result);

  console.log(`✓ Optimisations terminées: ${result.applied.length} appliquées, ${result.skipped.length} ignorées`);

  return result;
}

/**
 * Optimise la configuration Next.js
 */
async function optimizeNextConfig(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    const configPath = path.join(workDir, 'next.config.js');
    const configTsPath = path.join(workDir, 'next.config.ts');
    const targetPath = await fileExists(configPath) ? configPath : configTsPath;

    if (!await fileExists(targetPath)) {
      result.skipped.push('next.config.js - fichier non trouvé');
      return;
    }

    let config = await fs.readFile(targetPath, 'utf-8');

    // Ajouter les optimisations si absentes
    const optimizations = `
// Optimisations de performance
const nextConfig = {
  ...existingConfig,

  // Compression et minification
  compress: true,
  swcMinify: true,

  // Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },

  // Headers de cache pour assets statiques
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
    ];
  },

  // Optimisation du bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
            },
          },
        },
      };
    }
    return config;
  },
};
`;

    // Ne pas dupliquer si déjà présent
    if (!config.includes('swcMinify') && !config.includes('compress')) {
      // Insertion intelligente
      config = config.replace(
        /module\.exports\s*=\s*{/,
        `module.exports = {\n  ${optimizations.trim()}`
      );

      await fs.writeFile(targetPath, config, 'utf-8');
      result.applied.push('next.config.js - optimisations ajoutées');
    } else {
      result.skipped.push('next.config.js - déjà optimisé');
    }
  } catch (error: any) {
    result.errors.push(`next.config.js - ${error.message}`);
  }
}

/**
 * Optimise les images (ajout des attributs loading, fetchpriority)
 */
async function optimizeImages(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    // Recherche des composants Image
    const files = await findFiles(workDir, /\.(tsx|jsx)$/);

    let optimizedCount = 0;

    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;

      // Ajouter loading="lazy" si absent
      if (content.includes('<Image') && !content.includes('loading=')) {
        content = content.replace(
          /<Image\s/g,
          '<Image loading="lazy" '
        );
        modified = true;
      }

      // Ajouter decoding="async"
      if (content.includes('<Image') && !content.includes('decoding=')) {
        content = content.replace(
          /<Image\s/g,
          '<Image decoding="async" '
        );
        modified = true;
      }

      if (modified) {
        await fs.writeFile(file, content, 'utf-8');
        optimizedCount++;
      }
    }

    if (optimizedCount > 0) {
      result.applied.push(`Images - ${optimizedCount} fichiers optimisés`);
    } else {
      result.skipped.push('Images - aucun fichier à optimiser');
    }
  } catch (error: any) {
    result.errors.push(`Images - ${error.message}`);
  }
}

/**
 * Optimise les fonts (font-display: swap)
 */
async function optimizeFonts(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    const cssFiles = await findFiles(workDir, /\.css$/);
    let optimizedCount = 0;

    for (const file of cssFiles) {
      let content = await fs.readFile(file, 'utf-8');

      if (content.includes('@font-face') && !content.includes('font-display')) {
        content = content.replace(
          /@font-face\s*{/g,
          '@font-face {\n  font-display: swap;'
        );
        await fs.writeFile(file, content, 'utf-8');
        optimizedCount++;
      }
    }

    if (optimizedCount > 0) {
      result.applied.push(`Fonts - ${optimizedCount} fichiers optimisés (font-display: swap)`);
    } else {
      result.skipped.push('Fonts - aucun @font-face trouvé');
    }
  } catch (error: any) {
    result.errors.push(`Fonts - ${error.message}`);
  }
}

/**
 * Optimise les headers de cache
 */
async function optimizeCacheHeaders(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    // Créer un fichier middleware si absent
    const middlewarePath = path.join(workDir, 'middleware.ts');

    if (!await fileExists(middlewarePath)) {
      const middleware = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Headers de cache pour assets statiques
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Sécurité headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
`;

      await fs.writeFile(middlewarePath, middleware, 'utf-8');
      result.applied.push('Cache headers - middleware créé');
    } else {
      result.skipped.push('Cache headers - middleware existe déjà');
    }
  } catch (error: any) {
    result.errors.push(`Cache headers - ${error.message}`);
  }
}

/**
 * Optimise le bundle (minification)
 */
async function optimizeBundle(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    const packageJsonPath = path.join(workDir, 'package.json');
    if (!await fileExists(packageJsonPath)) {
      result.skipped.push('Bundle - package.json non trouvé');
      return;
    }

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Ajouter script d'analyse si absent
    if (!packageJson.scripts?.analyze) {
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.analyze = 'ANALYZE=true next build';

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      result.applied.push('Bundle - script analyze ajouté');
    } else {
      result.skipped.push('Bundle - script analyze existe déjà');
    }
  } catch (error: any) {
    result.errors.push(`Bundle - ${error.message}`);
  }
}

/**
 * Optimise le code splitting
 */
async function optimizeCodeSplitting(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    // Recherche des gros composants pouvant être lazy-loadés
    const files = await findFiles(workDir, /\.(tsx|jsx)$/);
    let optimizedCount = 0;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Suggérer dynamic import pour les composants lourds (Modal, Chart, etc.)
      if (/import.*from.*['"].*\/(Modal|Chart|Editor|Map)['"]/.test(content)) {
        // Juste un marqueur, ne modifie pas automatiquement
        // result.suggestions.push(`${file} - envisager dynamic() pour composants lourds`);
      }
    }

    result.skipped.push('Code splitting - analyse manuelle requise');
  } catch (error: any) {
    result.errors.push(`Code splitting - ${error.message}`);
  }
}

/**
 * Purge le CSS inutilisé (si Tailwind)
 */
async function purgeCss(
  workDir: string,
  result: PerfOptimizationResult
): Promise<void> {
  try {
    const tailwindConfigPath = path.join(workDir, 'tailwind.config.js');

    if (await fileExists(tailwindConfigPath)) {
      let config = await fs.readFile(tailwindConfigPath, 'utf-8');

      // Vérifier que purge est activé
      if (!config.includes('content:') && !config.includes('purge:')) {
        result.errors.push('Tailwind - configuration content manquante');
      } else {
        result.skipped.push('Tailwind - purge déjà configuré');
      }
    } else {
      result.skipped.push('CSS Purge - Tailwind non détecté');
    }
  } catch (error: any) {
    result.errors.push(`CSS Purge - ${error.message}`);
  }
}

/**
 * Utilitaires
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const results: string[] = [];

  async function scan(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Ignorer node_modules, .next, etc.
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore les erreurs de lecture
    }
  }

  await scan(dir);
  return results;
}
