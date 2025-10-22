/**
 * API Route pour lancer l'optimisation
 * POST /api/optimize
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConnection } from '@/lib/store';
import { runOptimizationPipeline, OptimizationConfig } from '@/lib/optimizer';
import { decryptJson } from '@/lib/crypto';

const OptimizeRequestSchema = z.object({
  connectionId: z.string(),
  masterPassword: z.string(),
  siteUrl: z.string().url(),
  lighthouseMinScores: z.object({
    performance: z.number().min(0).max(100),
    seo: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    bestPractices: z.number().min(0).max(100),
  }),
  optimizeBranch: z.string().default('chore/optimize-auto'),
  preferPr: z.boolean().default(true),
  constraints: z.string().optional(),
});

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'localhost').split(',');

/**
 * POST /api/optimize
 * Lance le pipeline d'optimisation complet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation du schéma
    const validation = OptimizeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Données invalides',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      connectionId,
      masterPassword,
      siteUrl,
      lighthouseMinScores,
      optimizeBranch,
      preferPr,
      constraints,
    } = validation.data;

    // Récupérer la connexion chiffrée
    const stored = await getConnection(connectionId);
    if (!stored) {
      return NextResponse.json(
        { ok: false, error: 'Connexion non trouvée' },
        { status: 404 }
      );
    }

    // Déchiffrer les données de connexion côté serveur
    // NOTE: Dans une vraie app, le déchiffrement devrait être côté client uniquement
    // Ici on accepte le mot de passe maître pour la démo
    let connectionData;
    try {
      connectionData = await decryptJson(stored.encrypted, masterPassword);
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'Mot de passe incorrect ou données corrompues' },
        { status: 401 }
      );
    }

    // Construire la configuration d'optimisation
    const config: OptimizationConfig = {
      connectionId,
      connectionData,
      siteUrl,
      lighthouseMinScores,
      optimizeBranch,
      preferPr,
      constraints,
      allowedHosts: ALLOWED_HOSTS,
    };

    console.log('🚀 Lancement du pipeline d\'optimisation...');
    console.log('  Site:', siteUrl);
    console.log('  Type:', connectionData.type);
    console.log('  Branche:', optimizeBranch);

    // Lancer le pipeline (peut être long)
    const report = await runOptimizationPipeline(config);

    // Construire la réponse
    const response = {
      ok: report.success,
      report: {
        before: report.lighthouse.before,
        after: report.lighthouse.after,
        mobile: report.lighthouse.mobile,
        diffs: report.diffs,
        bundles: report.bundles
          ? {
              totalSize: report.bundles.totalSize,
              largestFiles: report.bundles.largestFiles.slice(0, 5),
            }
          : undefined,
        perf: {
          applied: report.perf.applied.length,
          items: report.perf.applied,
        },
        seo: {
          applied: report.seo.applied.length,
          items: report.seo.applied,
        },
        errors: report.errors,
        warnings: report.warnings,
      },
      branch: report.branch,
      prUrl: report.prUrl,
      workDir: report.workDir,
    };

    if (!report.success) {
      return NextResponse.json(response, { status: 500 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erreur POST /api/optimize:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Erreur lors de l\'optimisation',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/optimize
 * Retourne le statut de l'optimiseur
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    status: 'ready',
    version: '1.0.0',
  });
}
