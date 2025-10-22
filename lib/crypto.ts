/**
 * Utilitaires cryptographiques pour le chiffrement côté client
 * AES-GCM 256 bits + PBKDF2 (150k itérations)
 */

export interface EncryptedData {
  salt: string; // Base64
  iv: string;   // Base64
  ct: string;   // Ciphertext Base64
  v: number;    // Version
}

const PBKDF2_ITERATIONS = 150_000;
const PBKDF2_HASH = 'SHA-256';
const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Dérive une clé cryptographique depuis un mot de passe
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre un objet JSON avec AES-GCM
 */
export async function encryptJson<T>(
  data: T,
  password: string
): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ct: arrayBufferToBase64(ciphertext),
    v: 1,
  };
}

/**
 * Déchiffre un objet JSON
 */
export async function decryptJson<T>(
  encrypted: EncryptedData,
  password: string
): Promise<T> {
  if (encrypted.v !== 1) {
    throw new Error('Version de chiffrement non supportée');
  }

  const salt = base64ToArrayBuffer(encrypted.salt);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ct);

  const key = await deriveKey(password, new Uint8Array(salt));

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const json = decoder.decode(plaintext);
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Échec du déchiffrement: mot de passe incorrect ou données corrompues');
  }
}

/**
 * Utilitaires de conversion Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Génère un ID unique pour une connexion
 */
export function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valide qu'un host est dans la liste autorisée
 */
export function isHostAllowed(host: string, allowedHosts: string[]): boolean {
  const normalizedHost = host.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  return allowedHosts.some(allowed => {
    const normalizedAllowed = allowed.toLowerCase();
    return normalizedHost === normalizedAllowed || normalizedHost.endsWith(`.${normalizedAllowed}`);
  });
}

/**
 * Hash rapide pour vérification d'intégrité (non cryptographique)
 */
export async function quickHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}
