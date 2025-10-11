import crypto from 'crypto';
import env from './env.mjs';

/**
 * Assina um state para OAuth com HMAC SHA-256
 */
export function signState(payload) {
  const data = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (payload.expSec || 600),
  };
  
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', env.OLX_STATE_SECRET)
    .update(encoded)
    .digest('base64url');
  
  return `${encoded}.${hmac}`;
}

/**
 * Verifica e decodifica um state assinado
 */
export function verifyState(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido');
  }
  
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Formato de token inválido');
  }
  
  const [encoded, signature] = parts;
  
  // Verifica assinatura
  const expectedSignature = crypto
    .createHmac('sha256', env.OLX_STATE_SECRET)
    .update(encoded)
    .digest('base64url');
  
  if (signature !== expectedSignature) {
    throw new Error('Assinatura inválida');
  }
  
  // Decodifica payload
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  
  // Verifica expiração
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expirado');
  }
  
  return payload;
}

/**
 * Normaliza returnTo para evitar open redirect
 */
export function normalizeReturnTo(returnTo, defaultPath = '/olx/conectado') {
  if (!returnTo || typeof returnTo !== 'string') {
    return defaultPath;
  }
  
  // Remove espaços e valida que é caminho relativo
  const normalized = returnTo.trim();
  
  // Deve começar com /
  if (!normalized.startsWith('/')) {
    return defaultPath;
  }
  
  // Não deve conter protocolo (evita redirects externos)
  if (normalized.includes('://') || normalized.includes('//')) {
    return defaultPath;
  }
  
  return normalized;
}

/**
 * Parse e valida parâmetros de paginação
 */
export function parsePageSize(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size) || 25));
  const offset = (page - 1) * size;
  
  return { page, size, offset };
}

/**
 * Valida UUID v4
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
