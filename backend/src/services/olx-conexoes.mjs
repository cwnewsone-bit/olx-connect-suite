import db from '../db.mjs';

/**
 * Retorna status seguro da conexão OLX (sem expor tokens)
 */
export async function getOlxStatus(userId) {
  const result = await db.query(
    `SELECT provider_user_email, obtained_at, expires_at
     FROM olx.oauth_connections
     WHERE user_id = $1 AND provider = 'OLX'
     ORDER BY obtained_at DESC
     LIMIT 1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return {
      connected: false,
      provider_user_email: null,
      obtained_at: null,
      expires_at: null,
    };
  }
  
  const conn = result.rows[0];
  
  return {
    connected: true,
    provider_user_email: conn.provider_user_email,
    obtained_at: conn.obtained_at?.toISOString() || null,
    expires_at: conn.expires_at?.toISOString() || null,
  };
}
