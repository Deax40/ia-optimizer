/**
 * API Routes pour une connexion spécifique
 * DELETE /api/connections/:id - Supprime une connexion
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteConnection, getConnection } from '@/lib/store';

/**
 * DELETE /api/connections/:id
 * Supprime une connexion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const deleted = await deleteConnection(id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: 'Connexion non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Connexion supprimée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur DELETE /api/connections/:id:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la suppression de la connexion' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/connections/:id
 * Récupère une connexion spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const connection = await getConnection(id);

    if (!connection) {
      return NextResponse.json(
        { ok: false, error: 'Connexion non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      connection: {
        id: connection.id,
        encrypted: connection.encrypted,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Erreur GET /api/connections/:id:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la récupération de la connexion' },
      { status: 500 }
    );
  }
}
