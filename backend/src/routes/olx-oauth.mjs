import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middlewares/auth.mjs';
import { signState, verifyState, normalizeReturnTo } from '../utils.mjs';
import db from '../db.mjs';
import env from '../env.mjs';

const router = express.Router();

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
router.get('/rest/oauth2-credential/callback', async (req, res, next) => {
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
    
    const { access_token, token_type, expires_in } = tokenResponse.data;
    
    if (!access_token) {
      throw new Error('Token não retornado pela OLX');
    }
    
    // Calcula expiração
    const obtainedAt = new Date();
    const expiresAt = expires_in
      ? new Date(obtainedAt.getTime() + expires_in * 1000)
      : null;
    
    // Persiste metadados da conexão (SEM o token)
    await db.query(
      `INSERT INTO olx.oauth_connections (user_id, provider, provider_user_email, obtained_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         provider_user_email = $3,
         obtained_at = $4,
         expires_at = $5,
         updated_at = now()`,
      [statePayload.uid, 'OLX', null, obtainedAt, expiresAt]
    );
    
    // TODO: Opcional - buscar email do perfil OLX se houver endpoint
    
    const returnTo = normalizeReturnTo(statePayload.returnTo);
    const redirectUrl = new URL(returnTo, env.FRONT_BASE_URL);
    
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Erro no callback OAuth:', error.message);
    res.redirect(`${env.FRONT_BASE_URL}/olx/conectado?error=callback_failed`);
  }
});

export default router;
