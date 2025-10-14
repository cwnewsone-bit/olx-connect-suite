import db from '../db.mjs';
import axios from 'axios';


/*Verificamos ao vivo se token ativo*/
export async function checkOlxStatusLive(userId) {
  // buscar o último registro, agora incluindo access_token
  const q = await db.query(
    `SELECT provider_user_email, access_token, obtained_at, expires_at
       FROM olx.conexoes
      WHERE user_id = $1 AND provider = 'OLX'
      ORDER BY obtained_at DESC NULLS LAST
      LIMIT 1`,
    [userId]
  );

  if (q.rows.length === 0) {
    return {
      connected: false,
      provider_user_email: null,
      obtained_at: null,
      expires_at: null,
      valid_via_api: false,
      reason: 'no_connection_row'
    };
  }

  const row = q.rows[0];

  // sem token já consideramos desconectado
  if (!row.access_token) {
    return {
      connected: false,
      provider_user_email: row.provider_user_email || null,
      obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      valid_via_api: false,
      reason: 'no_access_token'
    };
  }

  // se tiver expires_at e estiver no passado, também já marca como desconectado
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      connected: false,
      provider_user_email: row.provider_user_email || null,
      obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      valid_via_api: false,
      reason: 'expired_by_time'
    };
  }

  try {
    const r = await axios.post(
      'https://apps.olx.com.br/oauth_api/basic_user_info',
      { access_token: row.access_token },
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'User-Agent': 'ResponderOLX/1.0'
        }
      }
    );

    // Se chegou aqui, o token está válido “ao vivo”
    const emailFromOlx = r?.data?.email || r?.data?.user_email || null;

    // Se vier um e-mail diferente e válido, podemos atualizar o registro (opcional, sem quebrar nada)
    if (emailFromOlx && emailFromOlx !== row.provider_user_email) {
      await db.query(
        `UPDATE olx.conexoes
            SET provider_user_email = $1
          WHERE user_id = $2 AND provider = 'OLX'`,
        [emailFromOlx, userId]
      );
    }

    return {
      connected: true,
      provider_user_email: emailFromOlx || row.provider_user_email || null,
      obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      valid_via_api: true
    };
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      // token inválido/expirado na OLX
      return {
        connected: false,
        provider_user_email: row.provider_user_email || null,
        obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
        expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        valid_via_api: false,
        reason: 'token_invalid_or_revoked'
      };
    }
    // erro de rede/timeout/indefinido -> não derruba o status por tempo, apenas reporta falha
    return {
      connected: !!row.access_token && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()),
      provider_user_email: row.provider_user_email || null,
      obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      valid_via_api: false,
      reason: 'network_or_unknown'
    };
  }
  
}

/**
 * Retorna status seguro da conexão OLX (sem expor tokens)
 */
export async function getOlxStatus(userId) {
  const result = await db.query(
    `SELECT provider_user_email, obtained_at, expires_at
       FROM olx.conexoes
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
    obtained_at: conn.obtained_at || null,
    expires_at: conn.expires_at || null,
  };

}

// Pega o access_token OLX mais recente do usuário (e valida expiração básica)
export async function getOlxAccessTokenForUser(userId) {
  const q = await db.query(
    `SELECT access_token, refresh_token, expires_at, obtained_at
       FROM olx.conexoes
      WHERE user_id = $1 AND provider = 'OLX'
      ORDER BY obtained_at DESC NULLS LAST
      LIMIT 1`,
    [userId]
  );

  if (!q.rows.length) {
    throw new Error('no_olx_connection');
  }

  const row = q.rows[0];
  if (!row.access_token) {
    throw new Error('no_access_token');
  }

  // Se houver expires_at e estiver vencido, já acusamos (refresh pode ser implementado depois)
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    throw new Error('token_expired');
  }

  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token || null,
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    obtained_at: row.obtained_at ? new Date(row.obtained_at).toISOString() : null,
  };
}
