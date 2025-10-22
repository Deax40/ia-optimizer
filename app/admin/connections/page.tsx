'use client';

/**
 * Panel d'administration des connexions
 * /admin/connections
 */

import React, { useState, useEffect } from 'react';
import { encryptJson, decryptJson, generateId, EncryptedData } from '@/lib/crypto';
import { Download, Upload, Plus, Trash2, Edit2, TestTube, Play, Lock, Unlock } from 'lucide-react';

interface Connection {
  id: string;
  type: 'git' | 'ssh' | 'sftp';
  label: string;
  host?: string;
  port?: number;
  username?: string;
  authMethod?: 'password' | 'private_key' | 'none';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  repoUrl?: string;
  branch?: string;
}

interface StoredConnection {
  id: string;
  encrypted: EncryptedData;
  createdAt: string;
  updatedAt: string;
}

export default function ConnectionsPage() {
  const [masterPassword, setMasterPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [storedConnections, setStoredConnections] = useState<StoredConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Formulaire
  const [formData, setFormData] = useState<Partial<Connection>>({
    type: 'git',
    authMethod: 'password',
    port: 22,
  });

  // Charger les connexions depuis l'API
  const loadConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();

      if (data.ok) {
        setStoredConnections(data.connections);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des connexions:', error);
      alert('Erreur lors du chargement des connexions');
    }
  };

  // Déverrouiller le coffre
  const handleUnlock = async () => {
    if (!masterPassword) {
      alert('Veuillez entrer le mot de passe maître');
      return;
    }

    try {
      setLoading(true);

      // Déchiffrer toutes les connexions
      const decrypted: Connection[] = [];

      for (const stored of storedConnections) {
        try {
          const conn = await decryptJson<Connection>(stored.encrypted, masterPassword);
          decrypted.push({ ...conn, id: stored.id });
        } catch (error) {
          console.error('Erreur de déchiffrement pour', stored.id, error);
        }
      }

      setConnections(decrypted);
      setIsUnlocked(true);
    } catch (error) {
      alert('Erreur lors du déverrouillage');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder une connexion
  const handleSave = async () => {
    if (!masterPassword) {
      alert('Veuillez déverrouiller le coffre d\'abord');
      return;
    }

    if (!formData.label) {
      alert('Le label est requis');
      return;
    }

    try {
      setLoading(true);

      const id = formData.id || generateId();
      const connection: Connection = {
        ...formData,
        id,
      } as Connection;

      // Chiffrer les données
      const encrypted = await encryptJson(connection, masterPassword);

      // Envoyer à l'API
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, encrypted }),
      });

      const data = await res.json();

      if (data.ok) {
        alert('Connexion sauvegardée avec succès');
        await loadConnections();

        // Rafraîchir les connexions déchiffrées
        const updated = [...connections.filter((c) => c.id !== id), connection];
        setConnections(updated);

        // Réinitialiser le formulaire
        setFormData({ type: 'git', authMethod: 'password', port: 22 });
        setIsEditing(false);
        setSelectedConnection(null);
      } else {
        alert('Erreur lors de la sauvegarde: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une connexion
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette connexion ?')) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.ok) {
        alert('Connexion supprimée avec succès');
        setConnections(connections.filter((c) => c.id !== id));
        await loadConnections();
      } else {
        alert('Erreur lors de la suppression: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // Tester une connexion
  const handleTest = async (connection: Connection) => {
    try {
      setLoading(true);
      setTestResults({ ...testResults, [connection.id]: { loading: true } });

      const res = await fetch(`/api/connections/${connection.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decryptedData: connection }),
      });

      const result = await res.json();
      setTestResults({ ...testResults, [connection.id]: result });

      if (result.ok) {
        alert(`✅ Test réussi: ${result.details?.status || 'OK'}`);
      } else {
        alert(`❌ Test échoué: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors du test:', error);
      alert('Erreur lors du test de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Éditer une connexion
  const handleEdit = (connection: Connection) => {
    setFormData(connection);
    setSelectedConnection(connection);
    setIsEditing(true);
  };

  // Exporter le coffre
  const handleExport = () => {
    const json = JSON.stringify(storedConnections, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connections-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importer le coffre
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        alert('Format de fichier invalide');
        return;
      }

      // Envoyer chaque connexion
      for (const conn of imported) {
        await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conn),
        });
      }

      alert('Import réussi');
      await loadConnections();
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      alert('Erreur lors de l\'import');
    }
  };

  // Lancer l'optimisation
  const handleOptimize = async () => {
    if (!selectedConnection) {
      alert('Veuillez sélectionner une connexion');
      return;
    }

    if (!masterPassword) {
      alert('Mot de passe maître requis');
      return;
    }

    const siteUrl = prompt('URL du site à optimiser:', 'https://www.exemple.com');
    if (!siteUrl) return;

    try {
      setLoading(true);

      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          masterPassword,
          siteUrl,
          lighthouseMinScores: {
            performance: 90,
            seo: 95,
            accessibility: 90,
            bestPractices: 95,
          },
          optimizeBranch: 'chore/optimize-auto',
          preferPr: true,
        }),
      });

      const result = await res.json();

      if (result.ok) {
        alert(
          `✅ Optimisation réussie!\n\n` +
          `Branche: ${result.branch}\n` +
          `PR: ${result.prUrl || 'N/A'}\n\n` +
          `Scores après (desktop):\n` +
          `- Performance: ${result.report.after?.scores.performance}\n` +
          `- SEO: ${result.report.after?.scores.seo}\n` +
          `- Accessibilité: ${result.report.after?.scores.accessibility}\n\n` +
          `Optimisations appliquées: ${result.report.perf.applied + result.report.seo.applied}`
        );
      } else {
        alert(`❌ Optimisation échouée: ${result.error}\n\nErreurs: ${result.report?.errors?.join('\n')}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      alert('Erreur lors de l\'optimisation');
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadConnections();
  }, []);

  // Écran verrouillé
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Gestion des Connexions</h1>
          <p className="text-gray-600 text-center mb-6">
            Entrez votre mot de passe maître pour déverrouiller le coffre
          </p>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Mot de passe maître"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUnlock}
            disabled={loading || !masterPassword}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            {loading ? 'Déverrouillage...' : 'Déverrouiller'}
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            {storedConnections.length} connexion(s) chiffrée(s)
          </p>
        </div>
      </div>
    );
  }

  // Écran principal
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Connexions</h1>
              <p className="text-gray-600 mt-1">{connections.length} connexion(s) déchiffrée(s)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Importer
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setFormData({ type: 'git', authMethod: 'password', port: 22 });
                  setSelectedConnection(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Connexion
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des connexions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Connexions</h2>
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedConnection?.id === conn.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedConnection(conn)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{conn.label}</h3>
                      <p className="text-sm text-gray-600">
                        Type: {conn.type.toUpperCase()} • {conn.host || conn.repoUrl}
                      </p>
                      {testResults[conn.id]?.ok && (
                        <p className="text-xs text-green-600 mt-1">✓ Test réussi</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTest(conn);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                        title="Tester"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(conn);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conn.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {connections.length === 0 && (
                <p className="text-gray-500 text-center py-8">Aucune connexion</p>
              )}
            </div>
          </div>

          {/* Formulaire */}
          {isEditing && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedConnection ? 'Éditer' : 'Nouvelle'} Connexion
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    type="text"
                    value={formData.label || ''}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mon Serveur Production"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="git">Git</option>
                    <option value="ssh">SSH</option>
                    <option value="sftp">SFTP</option>
                  </select>
                </div>

                {formData.type === 'git' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL du Repo *
                      </label>
                      <input
                        type="text"
                        value={formData.repoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://github.com/user/repo.git"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branche
                      </label>
                      <input
                        type="text"
                        value={formData.branch || ''}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="main"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Host *
                        </label>
                        <input
                          type="text"
                          value={formData.host || ''}
                          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="exemple.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Port
                        </label>
                        <input
                          type="number"
                          value={formData.port || 22}
                          onChange={(e) =>
                            setFormData({ ...formData, port: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Méthode d'authentification
                      </label>
                      <select
                        value={formData.authMethod}
                        onChange={(e) =>
                          setFormData({ ...formData, authMethod: e.target.value as any })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="password">Mot de passe</option>
                        <option value="private_key">Clé privée</option>
                        <option value="none">Aucune</option>
                      </select>
                    </div>

                    {formData.authMethod === 'password' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe
                        </label>
                        <input
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {formData.authMethod === 'private_key' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Clé privée
                          </label>
                          <textarea
                            value={formData.privateKey || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, privateKey: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="-----BEGIN RSA PRIVATE KEY-----"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Passphrase (optionnel)
                          </label>
                          <input
                            type="password"
                            value={formData.passphrase || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, passphrase: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedConnection(null);
                      setFormData({ type: 'git', authMethod: 'password', port: 22 });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isEditing && selectedConnection && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleOptimize()}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Lancer l'optimisation
                </button>
                <p className="text-sm text-gray-600">
                  Lance le pipeline complet : clone, optimisations perf + SEO, audit Lighthouse,
                  création de PR.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
