/**
 * Module d'audit : Lighthouse + Bundle Analysis
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface LighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
}

export interface LighthouseResult {
  url: string;
  device: 'mobile' | 'desktop';
  scores: LighthouseScore;
  metrics: {
    fcp?: number;
    lcp?: number;
    cls?: number;
    tti?: number;
    tbt?: number;
    si?: number;
  };
  timestamp: string;
}

export interface BundleAnalysis {
  totalSize: number;
  files: Array<{
    path: string;
    size: number;
    percentage: number;
  }>;
  largestFiles: Array<{ path: string; size: number }>;
}

export interface AuditReport {
  lighthouse: {
    before?: LighthouseResult;
    after?: LighthouseResult;
    mobile?: LighthouseResult;
    desktop?: LighthouseResult;
  };
  bundles?: BundleAnalysis;
  timestamp: string;
}

const REPORTS_DIR = path.join(process.cwd(), '.reports');

/**
 * Lance un audit Lighthouse
 */
export async function runLighthouse(
  url: string,
  preset: 'mobile' | 'desktop' = 'mobile'
): Promise<LighthouseResult> {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });

    const timestamp = Date.now();
    const outputPath = path.join(REPORTS_DIR, `lh-${preset}-${timestamp}.json`);

    const formFactor = preset === 'mobile' ? 'mobile' : 'desktop';
    const screenEmulation = preset === 'mobile'
      ? '--screenEmulation.mobile=true --screenEmulation.width=375 --screenEmulation.height=667'
      : '--screenEmulation.mobile=false --screenEmulation.width=1920 --screenEmulation.height=1080';

    // Commande Lighthouse
    const command = `npx lighthouse "${url}" \
      --output=json \
      --output-path="${outputPath}" \
      --only-categories=performance,accessibility,best-practices,seo \
      --form-factor=${formFactor} \
      ${screenEmulation} \
      --quiet \
      --chrome-flags="--headless --no-sandbox --disable-gpu"`;

    console.log(`Lancement de Lighthouse (${preset}) pour ${url}...`);
    await execAsync(command, { timeout: 120000 }); // 2 min timeout

    // Lecture et parsing du résultat
    const rawData = await fs.readFile(outputPath, 'utf-8');
    const lhResult = JSON.parse(rawData);

    const result: LighthouseResult = {
      url,
      device: preset,
      scores: {
        performance: Math.round((lhResult.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhResult.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhResult.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhResult.categories.seo?.score || 0) * 100),
      },
      metrics: {
        fcp: lhResult.audits['first-contentful-paint']?.numericValue,
        lcp: lhResult.audits['largest-contentful-paint']?.numericValue,
        cls: lhResult.audits['cumulative-layout-shift']?.numericValue,
        tti: lhResult.audits['interactive']?.numericValue,
        tbt: lhResult.audits['total-blocking-time']?.numericValue,
        si: lhResult.audits['speed-index']?.numericValue,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`✓ Lighthouse ${preset} terminé - Scores:`, result.scores);

    return result;
  } catch (error: any) {
    console.error(`Erreur lors de l'audit Lighthouse (${preset}):`, error.message);
    // Retourne des scores par défaut en cas d'erreur
    return {
      url,
      device: preset,
      scores: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
      metrics: {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Analyse la taille des bundles
 */
export async function analyzeBundles(buildDir: string): Promise<BundleAnalysis> {
  try {
    const outDir = path.join(buildDir, '.next');
    const staticDir = path.join(outDir, 'static');

    // Cherche les fichiers JS dans le build
    const files: Array<{ path: string; size: number }> = [];

    async function scanDirectory(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
            const stats = await fs.stat(fullPath);
            const relativePath = path.relative(buildDir, fullPath);
            files.push({ path: relativePath, size: stats.size });
          }
        }
      } catch (error) {
        // Ignore les erreurs de répertoire
      }
    }

    await scanDirectory(staticDir);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const filesWithPercentage = files.map(f => ({
      ...f,
      percentage: totalSize > 0 ? (f.size / totalSize) * 100 : 0,
    }));

    const largestFiles = [...files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const analysis: BundleAnalysis = {
      totalSize,
      files: filesWithPercentage,
      largestFiles,
    };

    // Écriture d'un rapport markdown
    const reportPath = path.join(REPORTS_DIR, `bundles-${Date.now()}.md`);
    await writeBundleReport(analysis, reportPath);

    console.log(`✓ Analyse des bundles terminée - Taille totale: ${formatBytes(totalSize)}`);

    return analysis;
  } catch (error: any) {
    console.error('Erreur lors de l\'analyse des bundles:', error.message);
    return {
      totalSize: 0,
      files: [],
      largestFiles: [],
    };
  }
}

/**
 * Génère un rapport d'audit complet
 */
export async function generateAuditReport(
  beforeUrl?: string,
  afterUrl?: string
): Promise<AuditReport> {
  const report: AuditReport = {
    lighthouse: {},
    timestamp: new Date().toISOString(),
  };

  // Audit avant optimisation
  if (beforeUrl) {
    report.lighthouse.before = await runLighthouse(beforeUrl, 'desktop');
  }

  // Audit après optimisation
  if (afterUrl) {
    report.lighthouse.after = await runLighthouse(afterUrl, 'desktop');
    report.lighthouse.mobile = await runLighthouse(afterUrl, 'mobile');
  }

  return report;
}

/**
 * Écrit un rapport de bundles en Markdown
 */
async function writeBundleReport(analysis: BundleAnalysis, outputPath: string): Promise<void> {
  const lines = [
    '# Analyse des Bundles',
    '',
    `**Taille totale:** ${formatBytes(analysis.totalSize)}`,
    '',
    '## Top 10 des fichiers les plus lourds',
    '',
    '| Fichier | Taille |',
    '|---------|--------|',
  ];

  for (const file of analysis.largestFiles) {
    lines.push(`| ${file.path} | ${formatBytes(file.size)} |`);
  }

  lines.push('');
  lines.push('## Recommandations');
  lines.push('');
  lines.push('- Vérifier les dépendances lourdes et envisager des alternatives');
  lines.push('- Implémenter le code-splitting pour les pages volumineuses');
  lines.push('- Activer la compression Brotli/Gzip sur le serveur');
  lines.push('- Utiliser dynamic imports pour les composants non critiques');

  await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * Formate les bytes en format lisible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Compare deux audits et génère un rapport de différences
 */
export function compareAudits(
  before: LighthouseResult,
  after: LighthouseResult
): Record<string, number> {
  return {
    performance: after.scores.performance - before.scores.performance,
    accessibility: after.scores.accessibility - before.scores.accessibility,
    bestPractices: after.scores.bestPractices - before.scores.bestPractices,
    seo: after.scores.seo - before.scores.seo,
  };
}
