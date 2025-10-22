/**
 * API Route pour tester une connexion
 * POST /api/connections/:id/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/store';
import { isHostAllowed } from '@/lib/crypto';

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'localhost').split(',');

/**
 * POST /api/connections/:id/test
 * Teste une connexion (Git uniquement sur Vercel, SSH/SFTP en local)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Récupérer la connexion chiffrée
    const stored = await getConnection(id);
    if (!stored) {
      return NextResponse.json(
        { ok: false, error: 'Connexion non trouvée' },
        { status: 404 }
      );
    }

    // Le client doit envoyer les données déchiffrées pour le test
    const { decryptedData } = body;
    if (!decryptedData) {
      return NextResponse.json(
        { ok: false, error: 'Données déchiffrées manquantes' },
        { status: 400 }
      );
    }

    // Validation de sécurité : host autorisé
    const host = decryptedData.host || extractHostFromUrl(decryptedData.repoUrl);
    if (!isHostAllowed(host, ALLOWED_HOSTS)) {
      return NextResponse.json(
        { ok: false, error: `Host non autorisé: ${host}` },
        { status: 403 }
      );
    }

    // Tester selon le type
    let result;
    switch (decryptedData.type) {
      case 'git':
        result = await testGitConnection(decryptedData);
        break;
      case 'ssh':
      case 'sftp':
        result = {
          ok: true,
          type: decryptedData.type,
          details: {
            message: 'Test SSH/SFTP non disponible sur Vercel (modules natifs requis)',
            note: 'La connexion sera utilisée pour l\'optimisation mais ne peut être testée ici',
            host: decryptedData.host,
            port: decryptedData.port || 22,
            username: decryptedData.username,
          },
        };
        break;
      default:
        return NextResponse.json(
          { ok: false, error: `Type de connexion non supporté: ${decryptedData.type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erreur POST /api/connections/:id/test:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur lors du test de connexion' },
      { status: 500 }
    );
  }
}

/**
 * Teste une connexion Git (read-only)
 */
async function testGitConnection(data: any) {
  try {
    // Tester l'URL Git avec fetch (plus simple que simple-git)
    const repoUrl = data.repoUrl;

    // Pour GitHub/GitLab, on peut tester l'API
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
      if (match) {
        const [, owner, repo] = match;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            ok: true,
            type: 'git',
            details: {
              repoUrl: repoUrl,
              status: 'Repository accessible',
              name: data.name,
              description: data.description,
              stars: data.stargazers_count,
            },
          };
        } else if (response.status === 404) {
          return {
            ok: false,
            type: 'git',
            error: 'Repository non trouvé ou privé',
          };
        }
      }
    }

    if (repoUrl.includes('gitlab.com')) {
      const match = repoUrl.match(/gitlab\.com[:/]([^/]+)\/([^.]+)/);
      if (match) {
        const [, owner, repo] = match;
        const projectPath = encodeURIComponent(`${owner}/${repo}`);
        const apiUrl = `https://gitlab.com/api/v4/projects/${projectPath}`;

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            ok: true,
            type: 'git',
            details: {
              repoUrl: repoUrl,
              status: 'Repository accessible',
              name: data.name,
              description: data.description,
            },
          };
        }
      }
    }

    // Sinon, on indique juste que c'est un repo valide (format)
    return {
      ok: true,
      type: 'git',
      details: {
        repoUrl: repoUrl,
        status: 'Format URL valide (test complet nécessite git)',
        note: 'Le clone sera tenté lors de l\'optimisation',
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      type: 'git',
      error: `Erreur lors du test Git: ${error.message}`,
    };
  }
}

/**
 * Extrait le host depuis une URL Git
 */
function extractHostFromUrl(url: string): string {
  try {
    if (!url) return '';

    // Format SSH: git@github.com:user/repo.git
    if (url.startsWith('git@')) {
      const match = url.match(/git@([^:]+):/);
      return match ? match[1] : '';
    }

    // Format HTTPS: https://github.com/user/repo.git
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}
