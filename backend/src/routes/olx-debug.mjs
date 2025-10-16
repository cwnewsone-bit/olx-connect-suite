// src/routes/olx-debug.mjs
import express from 'express';
import db from '../db.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';
import axios from 'axios';

const router = express.Router();

// util: descobre token_path do user
async function getTokenPath(userId) {
  const { rows } = await db.query(
    `SELECT token_path FROM olx.leads_configs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );
  return rows[0]?.token_path || null;
}

/**
 * POST /debug/olx/send-test-lead
 * Rota para testar insert de lead antes de subir p producao
 */
router.post('/debug/olx/send-test-lead', authMiddleware, async (req, res, next) => {
  try {
    const tokenPath = await getTokenPath(req.user.id);
    if (!tokenPath) {
      return res.status(412).json({ error: 'no_token_path', message: 'Usuário sem token de lead configurado' });
    }

    const nowIso = new Date().toISOString();
    const listId = (req.body?.listId || 'sim-prod-qa-001').toString();
    const extId  = (req.body?.externalId || `test-${Date.now()}`).toString();
    const subject = (req.body?.subject || '[TESTE] Lead QA').toString();

    const payload = {
      source: 'OLX',
      createdAt: nowIso,
      listId,
      adId: 'sim-full-qa',
      linkAd: `https://www.olx.com.br/vi/${encodeURIComponent(listId)}.htm`,
      name: 'Teste Produção',
      email: 'qa@example.com',
      phone: '11 90000-0000',
      message: '[TESTE] Fluxo fim-a-fim em produção',
      externalId: extId,
      adsInfo: {
        category: 2020,
        subject,
        body: 'Lead gerado pelo endpoint de teste',
        type: 'car',
        price: 123,
        zipcode: '01000-000',
        regdate: '2020',
        mileage: 1000,
        carcolor: '1',
        fuel: '1',
        car_steering: '1',
        exchange: '0',
        owner: '1',
        financial: '2|3|4',
        financial_status: '1',
        vehicle_brand: '23',
        vehicle_model: '11',
        vehicle_version: '4',
        cubiccms: '21',
        moto_features: '',
      },
    };

    // chama seu próprio webhook (mesma instância)
    const base = process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;
    const url = `${base}/webhooks/olx/lead/${encodeURIComponent(tokenPath)}`;

    const r = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (r.status >= 200 && r.status < 300) {
      return res.json({ ok: true, responseId: r.data?.responseId || null, payload });
    }
    return res.status(r.status).json({ error: 'webhook_failed', details: r.data });
  } catch (err) {
    next(err);
  }
});

export default router;
