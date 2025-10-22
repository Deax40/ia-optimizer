/**
 * Système de stockage des connexions chiffrées
 * Stockage fichier avec fallback en mémoire
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EncryptedData } from './crypto';

export interface StoredConnection {
  id: string;
  encrypted: EncryptedData;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStore {
  connections: Record<string, StoredConnection>;
  version: number;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'connections.enc.json');
const STORE_VERSION = 1;

// Fallback en mémoire si le fichier n'est pas accessible
let memoryStore: ConnectionStore | null = null;

/**
 * Charge le store depuis le fichier ou la mémoire
 */
export async function loadStore(): Promise<ConnectionStore> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(data);

    if (parsed.version !== STORE_VERSION) {
      console.warn('Version du store incompatible, initialisation d\'un nouveau store');
      return initializeStore();
    }

    return parsed;
  } catch (error) {
    // Fichier n'existe pas ou erreur de lecture
    if (memoryStore) {
      console.log('Utilisation du store en mémoire (fallback)');
      return memoryStore;
    }

    console.log('Initialisation d\'un nouveau store');
    return initializeStore();
  }
}

/**
 * Sauvegarde le store sur disque (avec fallback mémoire)
 */
export async function saveStore(store: ConnectionStore): Promise<void> {
  try {
    // Créer le répertoire si nécessaire
    const dir = path.dirname(STORE_PATH);
    await fs.mkdir(dir, { recursive: true });

    // Écriture atomique
    const tempPath = `${STORE_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), 'utf-8');
    await fs.rename(tempPath, STORE_PATH);

    // Mettre à jour le cache mémoire
    memoryStore = store;
  } catch (error) {
    console.error('Erreur de sauvegarde sur disque, utilisation du fallback mémoire:', error);
    memoryStore = store;
  }
}

/**
 * Initialise un nouveau store vide
 */
function initializeStore(): ConnectionStore {
  return {
    connections: {},
    version: STORE_VERSION,
  };
}

/**
 * Récupère toutes les connexions
 */
export async function getAllConnections(): Promise<StoredConnection[]> {
  const store = await loadStore();
  return Object.values(store.connections);
}

/**
 * Récupère une connexion par ID
 */
export async function getConnection(id: string): Promise<StoredConnection | null> {
  const store = await loadStore();
  return store.connections[id] || null;
}

/**
 * Ajoute ou met à jour une connexion
 */
export async function upsertConnection(
  id: string,
  encrypted: EncryptedData
): Promise<StoredConnection> {
  const store = await loadStore();

  const now = new Date().toISOString();
  const existing = store.connections[id];

  const connection: StoredConnection = {
    id,
    encrypted,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  store.connections[id] = connection;
  await saveStore(store);

  return connection;
}

/**
 * Supprime une connexion
 */
export async function deleteConnection(id: string): Promise<boolean> {
  const store = await loadStore();

  if (!store.connections[id]) {
    return false;
  }

  delete store.connections[id];
  await saveStore(store);

  return true;
}

/**
 * Exporte le store complet (pour backup)
 */
export async function exportStore(): Promise<ConnectionStore> {
  return loadStore();
}

/**
 * Importe un store complet (pour restauration)
 */
export async function importStore(store: ConnectionStore): Promise<void> {
  if (store.version !== STORE_VERSION) {
    throw new Error('Version du store incompatible');
  }

  await saveStore(store);
}

/**
 * Nettoie les connexions obsolètes (optionnel)
 */
export async function pruneOldConnections(daysOld: number = 90): Promise<number> {
  const store = await loadStore();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  let deletedCount = 0;

  for (const [id, conn] of Object.entries(store.connections)) {
    const updatedAt = new Date(conn.updatedAt);
    if (updatedAt < cutoffDate) {
      delete store.connections[id];
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    await saveStore(store);
  }

  return deletedCount;
}
