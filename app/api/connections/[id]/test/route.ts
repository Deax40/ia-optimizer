/**
 * API Route pour tester une connexion
 * POST /api/connections/:id/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/store';
import { isHostAllowed } from '@/lib/crypto';

// Force Node.js runtime (requis pour ssh2)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'localhost').split(',');
const TEST_TIMEOUT = 10000; // 10 secondes

/**
 * POST /api/connections/:id/test
 * Teste une connexion (Git, SSH ou SFTP)
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
        result = await testSshConnection(decryptedData);
        break;
      case 'sftp':
        result = await testSftpConnection(decryptedData);
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
    // Import dynamique pour éviter les problèmes de build
    const simpleGit = (await import('simple-git')).default;
    const git = simpleGit();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT)
    );

    // Test avec ls-remote (read-only)
    const listRemote = git.listRemote([data.repoUrl]);

    await Promise.race([listRemote, timeout]);

    return {
      ok: true,
      type: 'git',
      details: {
        repoUrl: data.repoUrl,
        status: 'Repository accessible',
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      type: 'git',
      error: `Échec de connexion Git: ${error.message}`,
    };
  }
}

/**
 * Teste une connexion SSH
 */
async function testSshConnection(data: any): Promise<any> {
  try {
    // Import dynamique pour éviter les problèmes de build
    const { Client: SSHClient } = await import('ssh2');

    return new Promise((resolve) => {
      const conn = new SSHClient();

      const timeout = setTimeout(() => {
        conn.end();
        resolve({
          ok: false,
          type: 'ssh',
          error: 'Timeout de connexion',
        });
      }, TEST_TIMEOUT);

      conn.on('ready', () => {
        clearTimeout(timeout);

        // Exécuter une commande simple
        conn.exec('echo "ok"', (err, stream) => {
          if (err) {
            conn.end();
            return resolve({
              ok: false,
              type: 'ssh',
              error: `Erreur d'exécution: ${err.message}`,
            });
          }

          stream.on('close', () => {
            conn.end();
            resolve({
              ok: true,
              type: 'ssh',
              details: {
                host: data.host,
                port: data.port || 22,
                username: data.username,
                status: 'Connexion SSH réussie',
              },
            });
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          ok: false,
          type: 'ssh',
          error: `Erreur de connexion: ${err.message}`,
        });
      });

      // Configuration de connexion
      const config: any = {
        host: data.host,
        port: data.port || 22,
        username: data.username,
        readyTimeout: TEST_TIMEOUT,
      };

      if (data.authMethod === 'password' && data.password) {
        config.password = data.password;
      } else if (data.authMethod === 'private_key' && data.privateKey) {
        config.privateKey = data.privateKey;
        if (data.passphrase) {
          config.passphrase = data.passphrase;
        }
      }

      conn.connect(config);
    });
  } catch (error: any) {
    return {
      ok: false,
      type: 'ssh',
      error: `Erreur d'import SSH: ${error.message}`,
    };
  }
}

/**
 * Teste une connexion SFTP
 */
async function testSftpConnection(data: any): Promise<any> {
  try {
    // Import dynamique pour éviter les problèmes de build
    const { Client: SSHClient } = await import('ssh2');

    return new Promise((resolve) => {
      const conn = new SSHClient();

      const timeout = setTimeout(() => {
        conn.end();
        resolve({
          ok: false,
          type: 'sftp',
          error: 'Timeout de connexion',
        });
      }, TEST_TIMEOUT);

      conn.on('ready', () => {
        clearTimeout(timeout);

        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return resolve({
              ok: false,
              type: 'sftp',
              error: `Erreur SFTP: ${err.message}`,
            });
          }

          // Lister le répertoire root
          sftp.readdir('/', (err, list) => {
            sftp.end();
            conn.end();

            if (err) {
              return resolve({
                ok: false,
                type: 'sftp',
                error: `Erreur de lecture: ${err.message}`,
              });
            }

            resolve({
              ok: true,
              type: 'sftp',
              details: {
                host: data.host,
                port: data.port || 22,
                username: data.username,
                status: 'Connexion SFTP réussie',
                files: list?.length || 0,
              },
            });
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          ok: false,
          type: 'sftp',
          error: `Erreur de connexion: ${err.message}`,
        });
      });

      const config: any = {
        host: data.host,
        port: data.port || 22,
        username: data.username,
        readyTimeout: TEST_TIMEOUT,
      };

      if (data.authMethod === 'password' && data.password) {
        config.password = data.password;
      } else if (data.authMethod === 'private_key' && data.privateKey) {
        config.privateKey = data.privateKey;
        if (data.passphrase) {
          config.passphrase = data.passphrase;
        }
      }

      conn.connect(config);
    });
  } catch (error: any) {
    return {
      ok: false,
      type: 'sftp',
      error: `Erreur d'import SFTP: ${error.message}`,
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
