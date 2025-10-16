import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.mjs';
import { signState, verifyState, normalizeReturnTo } from '../utils.mjs';
import db from '../db.mjs';
import env from '../env.mjs';
import { randomBytes } from 'node:crypto';   // ⬅️ novo

const router = express.Router();

const OLX_AUTH_URL  = 'https://auth.olx.com.br/oauth';
const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token';

// ⬇️ novo: endpoint de lead da OLX
const OLX_LEAD_BASE = 'https://apps.olx.com.br/autoservice/v1/lead';

// ⬇️ novo: monta base pública do backend
function getPublicBaseUrl(req) {
  const fromEnv = (process.env.APP_BASE_URL || '').trim?.() || '';
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const proto = req.protocol;
  const host  = req.get('host'); // ex.: 80.190.82.217:4000
  return `${proto}://${host}`;
}

/**
 * Garante/atualiza a configuração de lead para um usuário:
 * - pega (ou cria) token_path em olx.leads_configs
 * - POST na OLX com { url, token }
 * - upsert local de olx_config_id + url
 */
async function ensureLeadConfigForUser(req, userId, access_token) {
  // 1) token_path local
  let rec = (await db.query(
    `SELECT token_path FROM olx.leads_configs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  )).rows[0];

  if (!rec?.token_path) {
    const tokenPath = randomBytes(24).toString('base64url');
    await db.query(
      `INSERT INTO olx.leads_configs (user_id, token_path, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (token_path) DO NOTHING`,
      [userId, tokenPath]
    );
    rec = { token_path: tokenPath };
  }

  const tokenPath  = rec.token_path;
  const webhookUrl = `${getPublicBaseUrl(req)}/webhooks/olx/lead/${tokenPath}`;

  // 2) cria/atualiza na OLX
  const { data } = await axios.post(
    OLX_LEAD_BASE,
    { url: webhookUrl, token: tokenPath },
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ResponderOLX/1.0'
      },
      timeout: 30000
    }
  );

  const olxConfigId = data?.id  ?? null;
  const finalUrl    = data?.url ?? webhookUrl;

  // 3) upsert local completo
  await db.query(
    `INSERT INTO olx.leads_configs (user_id, token_path, olx_config_id, url, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (token_path) DO UPDATE SET
       olx_config_id = EXCLUDED.olx_config_id,
       url           = EXCLUDED.url`,
    [userId, tokenPath, olxConfigId, finalUrl]
  );

  return { tokenPath, webhookUrl: finalUrl, olxConfigId };
}

/**
 * GET /oauth/olx/start-url (inalterado)
 */
router.get('/olx/start-url', authMiddleware, async (req, res, next) => {
  try {
    const returnTo = normalizeReturnTo(req.query.returnTo);
    const state = signState({ uid: req.user.id, returnTo, expSec: 600 });

    const authUrl = new URL(OLX_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', env.OLX_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', env.OLX_REDIRECT_URI);
    authUrl.searchParams.set('scope', env.DEFAULT_SCOPE);
    authUrl.searchParams.set('state', state);

    res.json({ ok: true, url: authUrl.toString() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rest/oauth2-credential/callback (ajustado)
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: stateToken, error: oauthError } = req.query;

    if (oauthError) {
      console.error('Erro OAuth OLX:', oauthError);
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=oauth_failed`);
    }
    if (!code) {
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=no_code`);
    }

    // valida state
    let statePayload;
    try {
      statePayload = verifyState(stateToken);
    } catch (err) {
      console.error('State inválido:', err.message);
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=invalid_state`);
    }

    // troca code por token
    const tokenParams = new URLSearchParams({
      code,
      client_id: env.OLX_CLIENT_ID,
      client_secret: env.OLX_CLIENT_SECRET,
      redirect_uri: env.OLX_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await axios.post(OLX_TOKEN_URL, tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const {
      access_token,
      token_type,
      refresh_token,
      scope,
      expires_in,
    } = tokenResponse.data || {};

    if (!access_token) {
      throw new Error('Token não retornado pela OLX');
    }

    const obtainedAt = new Date();
    const expiresAt = typeof expires_in === 'number'
      ? new Date(obtainedAt.getTime() + expires_in * 1000)
      : null;

    // (opcional) obter email do provider — placeholder
    let providerEmail = null;
    const userEmailRes = await db.query(
      'SELECT email FROM olx.usuarios WHERE id = $1',
      [statePayload.uid]
    );
    const fallbackEmail = userEmailRes.rows[0]?.email || 'olx-unknown@local';
    providerEmail = providerEmail ?? fallbackEmail;

    // salva/atualiza conexão OLX
    await db.query(
      `INSERT INTO olx.conexoes (
        user_id, provider, provider_user_email,
        access_token, refresh_token, token_type, scope,
        obtained_at, expires_at
      ) VALUES (
        $1, 'OLX', $2,
        $3, $4, $5, $6,
        $7, $8
      )
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        provider_user_email = EXCLUDED.provider_user_email,
        access_token        = EXCLUDED.access_token,
        refresh_token       = EXCLUDED.refresh_token,
        token_type          = EXCLUDED.token_type,
        scope               = EXCLUDED.scope,
        obtained_at         = EXCLUDED.obtained_at,
        expires_at          = EXCLUDED.expires_at`,
      [
        statePayload.uid,
        providerEmail,
        access_token || null,
        refresh_token || null,
        token_type || 'Bearer',
        scope || null,
        obtainedAt,
        expiresAt
      ]
    );

    // ⬇️ NOVO: garantir lead config na OLX e popular leads_configs (url + olx_config_id)
    try {
      const ensured = await ensureLeadConfigForUser(req, statePayload.uid, access_token);
      console.log('✅ Lead config criada/atualizada:', ensured);
    } catch (e) {
      // não bloqueia o login; apenas sinaliza no redirect
      console.error('Falha ao criar lead config na OLX:', e?.response?.data || e.message);
      const failUrl = new URL(normalizeReturnTo(statePayload.returnTo), env.FRONT_BASE_URL);
      failUrl.searchParams.set('lead_config', 'failed');
      return res.redirect(failUrl.toString());
    }

    // redireciona OK
    const returnTo = normalizeReturnTo(statePayload.returnTo);
    const redirectUrl = new URL(returnTo, env.FRONT_BASE_URL);
    redirectUrl.searchParams.set('lead_config', 'ok');
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Erro no callback OAuth:', error.message);
    res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=callback_failed`);
  }
});

export default router;
