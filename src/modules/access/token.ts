import crypto from 'crypto';
import { getEnv } from '@/server/env';

/**
 * Genera un secreto aleatorio criptográficamente seguro de 32 bytes en formato hex.
 */
export function generateRawSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calcula el hash HMAC-SHA-256 del secreto familiar usando el pepper privado del servidor.
 * Este hash es el que se almacena en Firestore; el secreto plano nunca se guarda.
 */
export function hashFamilySecret(secret: string): string {
  const env = getEnv();
  return crypto
    .createHmac('sha256', env.FAMILY_TOKEN_PEPPER)
    .update(secret.trim())
    .digest('hex');
}

/**
 * Genera un ID de sesión de 32 bytes aleatorios.
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calcula el hash SHA-256 de un ID de sesión para almacenamiento en base de datos.
 */
export function hashSessionId(sessionId: string): string {
  return crypto
    .createHash('sha256')
    .update(sessionId)
    .digest('hex');
}
