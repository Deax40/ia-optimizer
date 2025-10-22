/**
 * Module d'optimisation SEO
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SeoOptimizationResult {
  applied: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Applique toutes les optimisations SEO
 */
export async function applySeoOptimizations(
  workDir: string,
  siteUrl: string
): Promise<SeoOptimizationResult> {
  const result: SeoOptimizationResult = {
    applied: [],
    skipped: [],
    errors: [],
  };

  console.log('🔍 Application des optimisations SEO...');

  // 1. Metas et Open Graph
  await optimizeMetaTags(workDir, siteUrl, result);

  // 2. Robots.txt
  await optimizeRobotsTxt(workDir, siteUrl, result);

  // 3. Sitemap.xml
  await optimizeSitemap(workDir, siteUrl, result);

  // 4. Schema.org (JSON-LD)
  await addStructuredData(workDir, siteUrl, result);

  // 5. Canonical URLs
  await addCanonicalUrls(workDir, siteUrl, result);

  // 6. Alt texts pour images
  await checkImageAltTexts(workDir, result);

  console.log(`✓ Optimisations SEO terminées: ${result.applied.length} appliquées`);

  return result;
}

/**
 * Optimise les balises meta et Open Graph
 */
async function optimizeMetaTags(
  workDir: string,
  siteUrl: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    // Chercher le layout principal
    const layoutPaths = [
      path.join(workDir, 'app/layout.tsx'),
      path.join(workDir, 'src/app/layout.tsx'),
    ];

    let layoutPath: string | null = null;
    for (const p of layoutPaths) {
      if (await fileExists(p)) {
        layoutPath = p;
        break;
      }
    }

    if (!layoutPath) {
      result.skipped.push('Meta tags - layout.tsx non trouvé');
      return;
    }

    let layout = await fs.readFile(layoutPath, 'utf-8');

    // Vérifier si metadata existe déjà
    if (layout.includes('export const metadata')) {
      result.skipped.push('Meta tags - metadata déjà défini');
      return;
    }

    // Ajouter metadata
    const metadataBlock = `
export const metadata = {
  metadataBase: new URL('${siteUrl}'),
  title: {
    default: 'Votre Site',
    template: '%s | Votre Site',
  },
  description: 'Description de votre site pour les moteurs de recherche',
  keywords: ['mot-clé 1', 'mot-clé 2', 'mot-clé 3'],
  authors: [{ name: 'Votre Nom' }],
  creator: 'Votre Nom',
  publisher: 'Votre Organisation',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '${siteUrl}',
    title: 'Votre Site',
    description: 'Description de votre site',
    siteName: 'Votre Site',
    images: [
      {
        url: '${siteUrl}/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Image de prévisualisation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Votre Site',
    description: 'Description de votre site',
    images: ['${siteUrl}/og-image.jpg'],
    creator: '@votre_compte',
  },
  verification: {
    google: 'votre-code-google-search-console',
  },
};
`;

    // Insérer avant la déclaration du composant
    layout = layout.replace(
      /export default function/,
      `${metadataBlock}\n\nexport default function`
    );

    await fs.writeFile(layoutPath, layout, 'utf-8');
    result.applied.push('Meta tags - metadata ajouté au layout');
  } catch (error: any) {
    result.errors.push(`Meta tags - ${error.message}`);
  }
}

/**
 * Crée ou optimise robots.txt
 */
async function optimizeRobotsTxt(
  workDir: string,
  siteUrl: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    const robotsTxtPath = path.join(workDir, 'public/robots.txt');

    const robotsTxt = `# robots.txt
User-agent: *
Allow: /

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Crawl-delay (optionnel)
# Crawl-delay: 10

# Bloquer certains bots indésirables
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /
`;

    await fs.mkdir(path.join(workDir, 'public'), { recursive: true });
    await fs.writeFile(robotsTxtPath, robotsTxt, 'utf-8');

    result.applied.push('robots.txt - créé/mis à jour');
  } catch (error: any) {
    result.errors.push(`robots.txt - ${error.message}`);
  }
}

/**
 * Génère un sitemap.xml dynamique
 */
async function optimizeSitemap(
  workDir: string,
  siteUrl: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    const sitemapPath = path.join(workDir, 'app/sitemap.ts');

    if (await fileExists(sitemapPath)) {
      result.skipped.push('sitemap.xml - sitemap.ts existe déjà');
      return;
    }

    const sitemapCode = `import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = '${siteUrl}';

  // Routes statiques
  const routes = ['', '/about', '/contact', '/blog'].map((route) => ({
    url: \`\${baseUrl}\${route}\`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Ajouter ici les routes dynamiques (articles, produits, etc.)
  // Exemple: const posts = await getPosts();
  // const postUrls = posts.map(post => ({ url: ... }));

  return routes;
}
`;

    await fs.writeFile(sitemapPath, sitemapCode, 'utf-8');
    result.applied.push('sitemap.xml - sitemap.ts généré');
  } catch (error: any) {
    result.errors.push(`sitemap.xml - ${error.message}`);
  }
}

/**
 * Ajoute des données structurées Schema.org
 */
async function addStructuredData(
  workDir: string,
  siteUrl: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    // Créer un composant StructuredData réutilisable
    const componentDir = path.join(workDir, 'components/seo');
    await fs.mkdir(componentDir, { recursive: true });

    const structuredDataPath = path.join(componentDir, 'StructuredData.tsx');

    if (await fileExists(structuredDataPath)) {
      result.skipped.push('Schema.org - composant existe déjà');
      return;
    }

    const component = `import React from 'react';

interface StructuredDataProps {
  data: object;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Schemas prédéfinis
export const WebSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Votre Site',
  url: '${siteUrl}',
  description: 'Description de votre site',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: '${siteUrl}/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export const OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Votre Organisation',
  url: '${siteUrl}',
  logo: '${siteUrl}/logo.png',
  sameAs: [
    'https://www.facebook.com/votre-page',
    'https://www.twitter.com/votre-compte',
    'https://www.linkedin.com/company/votre-societe',
  ],
};

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified: string;
  author: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    author: {
      '@type': 'Person',
      name: article.author,
    },
  };
}
`;

    await fs.writeFile(structuredDataPath, component, 'utf-8');
    result.applied.push('Schema.org - composant StructuredData créé');
  } catch (error: any) {
    result.errors.push(`Schema.org - ${error.message}`);
  }
}

/**
 * Ajoute des URLs canoniques
 */
async function addCanonicalUrls(
  workDir: string,
  siteUrl: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    // Chercher les pages et ajouter canonical
    const files = await findFiles(workDir, /page\.tsx$/);
    let modifiedCount = 0;

    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');

      // Vérifier si metadata existe et ajouter alternates
      if (content.includes('export const metadata') && !content.includes('alternates')) {
        // Détecter la route depuis le chemin du fichier
        const relativePath = path.relative(workDir, path.dirname(file));
        const route = relativePath
          .replace(/^(app|src\/app)/, '')
          .replace(/\\/g, '/')
          .replace(/^\//, '');

        const canonicalUrl = route ? `${siteUrl}/${route}` : siteUrl;

        content = content.replace(
          /(export const metadata = {[^}]*)/,
          `$1\n  alternates: {\n    canonical: '${canonicalUrl}',\n  },`
        );

        await fs.writeFile(file, content, 'utf-8');
        modifiedCount++;
      }
    }

    if (modifiedCount > 0) {
      result.applied.push(`Canonical URLs - ${modifiedCount} pages mises à jour`);
    } else {
      result.skipped.push('Canonical URLs - aucune page à modifier');
    }
  } catch (error: any) {
    result.errors.push(`Canonical URLs - ${error.message}`);
  }
}

/**
 * Vérifie que les images ont des alt texts
 */
async function checkImageAltTexts(
  workDir: string,
  result: SeoOptimizationResult
): Promise<void> {
  try {
    const files = await findFiles(workDir, /\.(tsx|jsx)$/);
    const missingAlt: string[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Chercher <Image sans alt ou <img sans alt
      const imageRegex = /<(Image|img)\s+(?![^>]*alt=)[^>]*>/g;
      const matches = content.match(imageRegex);

      if (matches && matches.length > 0) {
        missingAlt.push(`${path.relative(workDir, file)} (${matches.length} images)`);
      }
    }

    if (missingAlt.length > 0) {
      result.errors.push(`Alt texts manquants dans: ${missingAlt.join(', ')}`);
    } else {
      result.applied.push('Alt texts - toutes les images ont des descriptions');
    }
  } catch (error: any) {
    result.errors.push(`Alt texts - ${error.message}`);
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
      // Ignore
    }
  }

  await scan(dir);
  return results;
}
