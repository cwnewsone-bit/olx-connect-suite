import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.mjs';
import { signState, verifyState, normalizeReturnTo } from '../utils.mjs';
import db from '../db.mjs';
import env from '../env.mjs';

const router = express.Router();

// Calcula expiração

const OLX_AUTH_URL = 'https://auth.olx.com.br/oauth';
const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token';

/**
 * GET /oauth/olx/start-url
 * Gera URL de autorização da OLX
 */
router.get('/olx/start-url', authMiddleware, async (req, res, next) => {
  try {
    const returnTo = normalizeReturnTo(req.query.returnTo);
    
    // Gera state assinado
    const state = signState({
      uid: req.user.id,
      returnTo,
      expSec: 600, // 10 minutos
    });
    
    // Monta URL de autorização
    const authUrl = new URL(OLX_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', env.OLX_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', env.OLX_REDIRECT_URI);
    authUrl.searchParams.set('scope', env.DEFAULT_SCOPE);
    authUrl.searchParams.set('state', state);
    
    res.json({
      ok: true,
      url: authUrl.toString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rest/oauth2-credential/callback
 * Callback da OLX após autorização
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: stateToken, error: oauthError } = req.query;
    
    // Verifica erros da OLX
    if (oauthError) {
      console.error('Erro OAuth OLX:', oauthError);
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=oauth_failed`);
    }
    
    if (!code) {
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=no_code`);
    }
    
    // Valida state
    let statePayload;
    try {
      statePayload = verifyState(stateToken);
    } catch (err) {
      console.error('State inválido:', err.message);
      return res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=invalid_state`);
    }

// Troca code por token
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

    // Desestrutura AGORA (depois do POST)
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

    // ⚠️ Declare AQUI, antes de usar em qualquer outro lugar
    const obtainedAt = new Date();
    const expiresAt = typeof expires_in === 'number'
      ? new Date(obtainedAt.getTime() + expires_in * 1000)
      : null;

    // (opcional) e-mail vindo do perfil OLX (ainda não implementado)
    let providerEmail = null;

    // 🔹 Fallback obrigatório por causa do NOT NULL na coluna provider_user_email
    const userEmailRes = await db.query(
      'SELECT email FROM olx.usuarios WHERE id = $1',
      [statePayload.uid]
    );
    const fallbackEmail = userEmailRes.rows[0]?.email || 'olx-unknown@local';
    providerEmail = providerEmail ?? fallbackEmail;

    // ✅ UPSERT completo na tabela REAL `olx.conexoes` (sem updated_at)
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

    // Redireciona para o front
    const returnTo = normalizeReturnTo(statePayload.returnTo);
    const redirectUrl = new URL(returnTo, env.FRONT_BASE_URL);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Erro no callback OAuth:', error.message);
    res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=callback_failed`);
  }
});

export default router;
