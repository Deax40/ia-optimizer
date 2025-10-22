/**
 * API Routes pour la gestion des connexions
 * GET /api/connections - Liste toutes les connexions (chiffrées)
 * POST /api/connections - Crée ou met à jour une connexion
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllConnections, upsertConnection } from '@/lib/store';
import { generateId } from '@/lib/crypto';

// Schéma de validation pour les données chiffrées
const EncryptedDataSchema = z.object({
  salt: z.string(),
  iv: z.string(),
  ct: z.string(),
  v: z.number(),
});

const CreateConnectionSchema = z.object({
  id: z.string().optional(),
  encrypted: EncryptedDataSchema,
});

/**
 * GET /api/connections
 * Retourne toutes les connexions (blobs chiffrés uniquement)
 */
export async function GET(request: NextRequest) {
  try {
    const connections = await getAllConnections();

    return NextResponse.json({
      ok: true,
      connections: connections.map((conn) => ({
        id: conn.id,
        encrypted: conn.encrypted,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Erreur GET /api/connections:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la récupération des connexions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connections
 * Crée ou met à jour une connexion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation du schéma
    const validation = CreateConnectionSchema.safeParse(body);
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

    const { id, encrypted } = validation.data;

    // Générer un ID si absent
    const connectionId = id || generateId();

    // Sauvegarder la connexion
    const saved = await upsertConnection(connectionId, encrypted);

    return NextResponse.json({
      ok: true,
      id: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  } catch (error: any) {
    console.error('Erreur POST /api/connections:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la sauvegarde de la connexion' },
      { status: 500 }
    );
  }
}
