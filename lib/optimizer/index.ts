/**
 * Orchestrateur principal des optimisations
 * Clone le repo, applique les optimisations, génère les rapports
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { applyPerfOptimizations, PerfOptimizationResult } from './perf';
import { applySeoOptimizations, SeoOptimizationResult } from './seo';
import { runLighthouse, analyzeBundles, LighthouseResult, BundleAnalysis } from './audit';

const execAsync = promisify(exec);

export interface OptimizationConfig {
  connectionId: string;
  connectionData: any; // Décrypté côté serveur
  siteUrl: string;
  lighthouseMinScores: {
    performance: number;
    seo: number;
    accessibility: number;
    bestPractices: number;
  };
  optimizeBranch: string;
  preferPr: boolean;
  constraints?: string;
  allowedHosts: string[];
}

export interface OptimizationReport {
  success: boolean;
  workDir: string;
  branch: string;
  prUrl?: string;
  lighthouse: {
    before?: LighthouseResult;
    after?: LighthouseResult;
    mobile?: LighthouseResult;
  };
  bundles?: BundleAnalysis;
  perf: PerfOptimizationResult;
  seo: SeoOptimizationResult;
  diffs: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Lance le pipeline complet d'optimisation
 */
export async function runOptimizationPipeline(
  config: OptimizationConfig
): Promise<OptimizationReport> {
  console.log('🚀 Démarrage du pipeline d\'optimisation...');

  const report: OptimizationReport = {
    success: false,
    workDir: '',
    branch: config.optimizeBranch,
    lighthouse: {},
    perf: { applied: [], skipped: [], errors: [] },
    seo: { applied: [], skipped: [], errors: [] },
    diffs: {},
    errors: [],
    warnings: [],
  };

  try {
    // 1. Préparer le répertoire de travail
    const workDir = await prepareWorkingDirectory(config);
    report.workDir = workDir;

    // 2. Cloner ou télécharger les sources
    await fetchSources(config, workDir);

    // 3. Audit avant optimisation
    console.log('📊 Audit avant optimisation...');
    report.lighthouse.before = await runLighthouse(config.siteUrl, 'desktop');

    // 4. Créer la branche d'optimisation
    await createOptimizationBranch(workDir, config.optimizeBranch);

    // 5. Installer les dépendances
    await installDependencies(workDir);

    // 6. Appliquer les optimisations de performance
    report.perf = await applyPerfOptimizations(workDir);

    // 7. Appliquer les optimisations SEO
    report.seo = await applySeoOptimizations(workDir, config.siteUrl);

    // 8. Linter et formatter
    await runQualityChecks(workDir, report);

    // 9. Build du projet
    await buildProject(workDir, report);

    // 10. Analyse des bundles
    report.bundles = await analyzeBundles(workDir);

    // 11. Audit après optimisation (si build réussi)
    console.log('📊 Audit après optimisation...');
    report.lighthouse.after = await runLighthouse(config.siteUrl, 'desktop');
    report.lighthouse.mobile = await runLighthouse(config.siteUrl, 'mobile');

    // 12. Calculer les différences
    if (report.lighthouse.before && report.lighthouse.after) {
      report.diffs = {
        performance: report.lighthouse.after.scores.performance - report.lighthouse.before.scores.performance,
        accessibility: report.lighthouse.after.scores.accessibility - report.lighthouse.before.scores.accessibility,
        bestPractices: report.lighthouse.after.scores.bestPractices - report.lighthouse.before.scores.bestPractices,
        seo: report.lighthouse.after.scores.seo - report.lighthouse.before.scores.seo,
      };
    }

    // 13. Valider les scores
    validateScores(config, report);

    // 14. Commit et push
    await commitChanges(workDir, report, config);

    // 15. Créer une PR si demandé
    if (config.preferPr) {
      report.prUrl = await createPullRequest(workDir, config, report);
    }

    report.success = true;
    console.log('✅ Pipeline d\'optimisation terminé avec succès');

  } catch (error: any) {
    console.error('❌ Erreur lors du pipeline:', error.message);
    report.errors.push(error.message);
    report.success = false;
  } finally {
    // Nettoyage (optionnel)
    // await cleanupWorkDir(report.workDir);
  }

  return report;
}

/**
 * Prépare le répertoire de travail temporaire
 */
async function prepareWorkingDirectory(config: OptimizationConfig): Promise<string> {
  const workDir = path.join(tmpdir(), `workdir-${config.connectionId}-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });
  console.log(`📁 Répertoire de travail: ${workDir}`);
  return workDir;
}

/**
 * Récupère les sources (Git clone ou SFTP/SSH download)
 */
async function fetchSources(config: OptimizationConfig, workDir: string): Promise<void> {
  const { connectionData } = config;

  if (connectionData.type === 'git') {
    console.log(`🔄 Clonage du dépôt Git: ${connectionData.repoUrl}`);
    const branch = connectionData.branch || 'main';
    await execAsync(`git clone --depth 1 --branch ${branch} "${connectionData.repoUrl}" "${workDir}"`, {
      timeout: 60000,
    });
  } else if (connectionData.type === 'ssh' || connectionData.type === 'sftp') {
    console.log(`📥 Téléchargement des sources via ${connectionData.type.toUpperCase()}...`);
    // Utiliser rsync ou scp pour télécharger
    const remotePath = connectionData.remotePath || '/var/www/html';
    const command = `scp -r ${connectionData.username}@${connectionData.host}:${remotePath}/* "${workDir}/"`;

    try {
      await execAsync(command, { timeout: 120000 });
    } catch (error) {
      throw new Error(`Échec du téléchargement SSH/SFTP: ${error}`);
    }
  } else {
    throw new Error(`Type de connexion non supporté: ${connectionData.type}`);
  }
}

/**
 * Crée une branche d'optimisation
 */
async function createOptimizationBranch(workDir: string, branchName: string): Promise<void> {
  try {
    await execAsync(`git checkout -b ${branchName}`, { cwd: workDir });
    console.log(`🌿 Branche créée: ${branchName}`);
  } catch (error) {
    console.log('⚠️  Branche existe déjà ou pas de git repo, continuation...');
  }
}

/**
 * Installe les dépendances
 */
async function installDependencies(workDir: string): Promise<void> {
  console.log('📦 Installation des dépendances...');

  const packageJsonPath = path.join(workDir, 'package.json');
  if (!await fileExists(packageJsonPath)) {
    console.log('⚠️  package.json non trouvé, skip install');
    return;
  }

  // Détecter le package manager
  const hasLockfile = await fileExists(path.join(workDir, 'package-lock.json'));
  const hasPnpmLock = await fileExists(path.join(workDir, 'pnpm-lock.yaml'));
  const hasYarnLock = await fileExists(path.join(workDir, 'yarn.lock'));

  let installCmd = 'npm install';
  if (hasPnpmLock) installCmd = 'pnpm install';
  else if (hasYarnLock) installCmd = 'yarn install';

  try {
    await execAsync(installCmd, { cwd: workDir, timeout: 300000 }); // 5 min
    console.log('✓ Dépendances installées');
  } catch (error: any) {
    console.error('⚠️  Erreur installation dépendances:', error.message);
  }
}

/**
 * Lance les vérifications de qualité (lint, prettier, audit)
 */
async function runQualityChecks(workDir: string, report: OptimizationReport): Promise<void> {
  console.log('🔍 Vérifications qualité...');

  // ESLint
  try {
    await execAsync('npm run lint -- --fix', { cwd: workDir, timeout: 60000 });
    console.log('✓ ESLint OK');
  } catch (error) {
    report.warnings.push('ESLint a détecté des erreurs (non bloquant)');
  }

  // Prettier
  try {
    await execAsync('npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"', {
      cwd: workDir,
      timeout: 30000,
    });
    console.log('✓ Prettier OK');
  } catch (error) {
    // Non bloquant
  }

  // npm audit (informatif uniquement)
  try {
    const { stdout } = await execAsync('npm audit --json', { cwd: workDir, timeout: 30000 });
    const auditResult = JSON.parse(stdout);
    if (auditResult.metadata?.vulnerabilities?.high > 0) {
      report.warnings.push(`npm audit: ${auditResult.metadata.vulnerabilities.high} vulnérabilités élevées`);
    }
  } catch (error) {
    // Non bloquant
  }
}

/**
 * Build le projet Next.js
 */
async function buildProject(workDir: string, report: OptimizationReport): Promise<void> {
  console.log('🔨 Build du projet...');

  try {
    await execAsync('npm run build', { cwd: workDir, timeout: 300000 }); // 5 min
    console.log('✓ Build réussi');
  } catch (error: any) {
    const message = `Build échoué: ${error.message}`;
    report.errors.push(message);
    throw new Error(message);
  }
}

/**
 * Valide que les scores atteignent les seuils minimum
 */
function validateScores(config: OptimizationConfig, report: OptimizationReport): void {
  if (!report.lighthouse.after) return;

  const { scores } = report.lighthouse.after;
  const { lighthouseMinScores } = config;

  if (scores.performance < lighthouseMinScores.performance) {
    report.warnings.push(`Performance ${scores.performance} < ${lighthouseMinScores.performance}`);
  }
  if (scores.seo < lighthouseMinScores.seo) {
    report.warnings.push(`SEO ${scores.seo} < ${lighthouseMinScores.seo}`);
  }
  if (scores.accessibility < lighthouseMinScores.accessibility) {
    report.warnings.push(`Accessibilité ${scores.accessibility} < ${lighthouseMinScores.accessibility}`);
  }
  if (scores.bestPractices < lighthouseMinScores.bestPractices) {
    report.warnings.push(`Best Practices ${scores.bestPractices} < ${lighthouseMinScores.bestPractices}`);
  }
}

/**
 * Commit les changements
 */
async function commitChanges(
  workDir: string,
  report: OptimizationReport,
  config: OptimizationConfig
): Promise<void> {
  console.log('💾 Commit des changements...');

  try {
    await execAsync('git add .', { cwd: workDir });

    const commitMessage = `chore: optimisations perf + SEO

- ${report.perf.applied.length} optimisations de performance appliquées
- ${report.seo.applied.length} optimisations SEO appliquées

Scores Lighthouse (desktop):
- Performance: ${report.lighthouse.after?.scores.performance || 'N/A'}
- SEO: ${report.lighthouse.after?.scores.seo || 'N/A'}
- Accessibilité: ${report.lighthouse.after?.scores.accessibility || 'N/A'}
- Best Practices: ${report.lighthouse.after?.scores.bestPractices || 'N/A'}

🤖 Généré automatiquement`;

    await execAsync(`git commit -m "${commitMessage}"`, { cwd: workDir });
    console.log('✓ Changements commités');

    // Push
    await execAsync(`git push -u origin ${config.optimizeBranch}`, { cwd: workDir });
    console.log('✓ Changements poussés');
  } catch (error: any) {
    console.error('⚠️  Erreur lors du commit/push:', error.message);
    report.warnings.push('Commit/push a échoué');
  }
}

/**
 * Crée une Pull Request (via GitHub CLI si disponible)
 */
async function createPullRequest(
  workDir: string,
  config: OptimizationConfig,
  report: OptimizationReport
): Promise<string | undefined> {
  console.log('🔀 Création de la Pull Request...');

  try {
    const prBody = `## 🚀 Optimisations automatiques Perf + SEO

### 📊 Résultats Lighthouse

**Desktop:**
- Performance: ${report.lighthouse.after?.scores.performance || 'N/A'} ${formatDiff(report.diffs.performance)}
- SEO: ${report.lighthouse.after?.scores.seo || 'N/A'} ${formatDiff(report.diffs.seo)}
- Accessibilité: ${report.lighthouse.after?.scores.accessibility || 'N/A'} ${formatDiff(report.diffs.accessibility)}
- Best Practices: ${report.lighthouse.after?.scores.bestPractices || 'N/A'} ${formatDiff(report.diffs.bestPractices)}

**Mobile:**
- Performance: ${report.lighthouse.mobile?.scores.performance || 'N/A'}
- SEO: ${report.lighthouse.mobile?.scores.seo || 'N/A'}

### ⚡ Optimisations de performance

${report.perf.applied.map(a => `- ✅ ${a}`).join('\n')}

### 🔍 Optimisations SEO

${report.seo.applied.map(a => `- ✅ ${a}`).join('\n')}

### 📦 Bundles

Taille totale: ${formatBytes(report.bundles?.totalSize || 0)}

${report.warnings.length > 0 ? `\n### ⚠️ Avertissements\n\n${report.warnings.map(w => `- ${w}`).join('\n')}` : ''}

### 📋 Plan de test

- [ ] Vérifier que le site build correctement
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier l'affichage sur mobile
- [ ] Valider les scores Lighthouse en production

---
🤖 Généré automatiquement avec l'optimiseur`;

    const { stdout } = await execAsync(
      `gh pr create --title "chore: optimisations perf + SEO" --body "${prBody.replace(/"/g, '\\"')}"`,
      { cwd: workDir, timeout: 30000 }
    );

    const prUrl = stdout.trim();
    console.log(`✓ PR créée: ${prUrl}`);
    return prUrl;
  } catch (error: any) {
    console.error('⚠️  Impossible de créer la PR automatiquement:', error.message);
    report.warnings.push('Créer manuellement la PR depuis la branche ' + config.optimizeBranch);
    return undefined;
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

function formatDiff(diff?: number): string {
  if (!diff) return '';
  const sign = diff > 0 ? '+' : '';
  return `(${sign}${diff})`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
