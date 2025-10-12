import express from 'express';
import { authMiddleware } from '../middlewares/auth.mjs';
import { getAnuncios } from '../services/anuncios.mjs';
import { getContatos } from '../services/contatos.mjs';
import { getOlxStatus, checkOlxStatusLive } from '../services/olx-conexoes.mjs'; /* ROTA DE CHECK conexão ao vivo */

const router = express.Router();

/**
 * GET /api/olx/status
 * Retorna status da conexão OLX do usuário
 */
router.get('/olx/status', authMiddleware, async (req, res, next) => {
  try {
    const doLive = String(req.query.live || '0') === '1';

    if (doLive && typeof checkOlxStatusLive === 'function') {
      // Tenta validar/atualizar o status em tempo real (sem quebrar fluxo se falhar)
      try {
        await checkOlxStatusLive(req.user.id);
      } catch (e) {
        // Loga e segue com o status do banco
        console.warn('checkOlxStatusLive falhou:', e?.message || e);
      }
    }

    // Sempre retorna um OBJETO no contrato esperado
    const status = await getOlxStatus(req.user.id);

    const normalized =
      status && typeof status === 'object'
        ? status
        : { connected: false, provider_user_email: null, obtained_at: null, expires_at: null };

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anuncios
 * Lista anúncios do usuário com filtros e paginação
 */
router.get('/anuncios', authMiddleware, async (req, res, next) => {
  try {
    const anuncios = await getAnuncios(req.user.id, req.query);
    res.json(anuncios);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contatos
 * Lista contatos/leads do usuário com filtros e paginação
 */
router.get('/contatos', authMiddleware, async (req, res, next) => {
  try {
    const contatos = await getContatos(req.user.id, req.query);
    res.json(contatos);
  } catch (error) {
    next(error);
  }
});

export default router;
