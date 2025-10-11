import express from 'express';
import { authMiddleware } from '../middlewares/auth.mjs';
import { getAnuncios } from '../services/anuncios.mjs';
import { getContatos } from '../services/contatos.mjs';
import { getOlxStatus } from '../services/olx-conexoes.mjs';

const router = express.Router();

/**
 * GET /api/olx/status
 * Retorna status da conexão OLX do usuário
 */
router.get('/olx/status', authMiddleware, async (req, res, next) => {
  try {
    const status = await getOlxStatus(req.user.id);
    res.json(status);
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
