// routes/olx-leads.mjs
import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { authMiddleware } from '../middlewares/auth.mjs';
import { getOlxAccessTokenForUser } from '../services/olx-conexoes.mjs';
import db from '../db.mjs';
import crypto from 'node:crypto';

const router = express.Router();
const BASE = 'https://apps.olx.com.br/autoservice/v1/lead';

// ----------------- helpers -----------------
function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = String(v).replace(/\D/g, '');
  return n ? parseInt(n, 10) : null;
}
function splitPipeToArray(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.map(x => String(x)).filter(Boolean);
  const arr = String(v).split('|').map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}
function uniqKey({ userId, listId, adId, createdAt, externalId, email, phone }) {
  const base = [
    userId || '',
    listId || '',
    adId || '',
    createdAt || '',
    externalId || '',
    (email || '').toLowerCase(),
    phone || ''
  ].join('|');
  return crypto.createHash('sha256').update(base).digest('hex');
}

// Decodifica Bearer aceitável: token puro OU base64("olx:<token>") OU base64("<token>")
function bearerMatches(rawAuth, expectedToken) {
  if (!rawAuth) return false;
  const header = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const parts = String(header).split(' ').filter(Boolean);
  if (parts.length < 2) return false;

  const provided = parts.slice(1).join(' ').trim(); // tolera espaços a mais
  // 1) token puro
  if (provided === expectedToken) return true;

  // 2) base64
  try {
    const decoded = Buffer.from(provided, 'base64').toString('utf8');
    if (decoded === `olx:${expectedToken}` || decoded === expectedToken) return true;
  } catch (_) { /* ignore */ }

  return false;
}

// ----------------- memória de debug opcional -----------------
let __lastLeadDebug = null;
router.get('/debug/olx/last-lead', async (_req, res) => {
  if (!__lastLeadDebug) return res.json({ ok: true, hasLead: false });
  return res.json({ ok: true, hasLead: true, last: __lastLeadDebug });
});

// ----------------- Schemas -----------------
const createSchema = z.object({
  url: z.string().url('URL inválida'),
  token: z.string().min(1).optional()
});
const updateSchema = z.object({
  url: z.string().url('URL inválida')
});

// ----------------- Criar configuração -----------------
router.post('/api/olx/leads/config', authMiddleware, async (req, res) => {
  try {
    const body = createSchema.parse(req.body);
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);

    const { data } = await axios.post(BASE, body, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ResponderOLX/1.0'
      },
      timeout: 30000
    });

    // Persiste vínculo token_path -> user_id (para o webhook resolver o dono)
    if (body.token) {
      await db.query(
        `INSERT INTO olx.leads_configs (user_id, token_path, olx_config_id, url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token_path) DO UPDATE SET
           olx_config_id = EXCLUDED.olx_config_id,
           url           = EXCLUDED.url`,
        [req.user.id, body.token, data?.id || null, data?.url || body.url]
      );
    }

    return res.status(201).json({ ok: true, config: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'invalid_body', details: err.errors });
    }
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: 'create_lead_config_failed',
      details: err?.response?.data || err.message
    });
  }
});

// ----------------- Consultar configuração -----------------
router.get('/api/olx/leads/config/:id', authMiddleware, async (req, res) => {
  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);
    const { id } = req.params;

    const { data } = await axios.get(`${BASE}/${encodeURIComponent(id)}`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
      timeout: 30000
    });

    return res.json({ ok: true, config: data });
  } catch (err) {
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: 'get_lead_config_failed',
      details: err?.response?.data || err.message
    });
  }
});

// ----------------- Atualizar configuração -----------------
router.put('/api/olx/leads/config/:id', authMiddleware, async (req, res) => {
  try {
    const body = updateSchema.parse(req.body);
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);
    const { id } = req.params;

    const { data } = await axios.put(`${BASE}/${encodeURIComponent(id)}`, body, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ResponderOLX/1.0'
      },
      timeout: 30000
    });

    // Atualiza URL local também (se existir vinculado por olx_config_id)
    await db.query(
      `UPDATE olx.leads_configs
         SET url = $1
       WHERE olx_config_id = $2`,
      [data?.url || body.url, id]
    );

    return res.json({ ok: true, config: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'invalid_body', details: err.errors });
    }
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: 'update_lead_config_failed',
      details: err?.response?.data || err.message
    });
  }
});

// ----------------- Excluir configuração -----------------
router.delete('/api/olx/leads/config/:id', authMiddleware, async (req, res) => {
  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);
    const { id } = req.params;

    const r = await axios.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ResponderOLX/1.0'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    // Apaga vínculo local pela olx_config_id
    if (r.status === 204) {
      await db.query(
        `DELETE FROM olx.leads_configs WHERE olx_config_id = $1`,
        [id]
      );
      return res.status(204).send();
    }
    return res.status(r.status).json({ error: 'delete_lead_config_failed', details: r.data || null });
  } catch (err) {
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: 'delete_lead_config_failed',
      details: err?.response?.data || err.message
    });
  }
});

// ----------------- Webhook receptor de leads -----------------
// Um endpoint por anunciante. Ex: https://seuservidor/webhooks/olx/lead/:token
router.post('/webhooks/olx/lead/:token', express.json({ limit: '1mb' }), async (req, res) => {
  const responseId = crypto.randomUUID();

  try {
    const tokenParam = String(req.params.token || '');

    // Auth opcional (mantido)
    const rawAuth = req.headers['authorization'] || '';
    if (rawAuth && !bearerMatches(rawAuth, tokenParam)) {
      res.setHeader('X-Response-Id', responseId);
      return res.status(401).json({ error: 'invalid_signature', responseId });
    }

    // Payload & ads
    const lead = (req.body ?? {});
    const ads  = (lead.adsInfo ?? {});

    // DEBUG em memória
    __lastLeadDebug = {
      receivedAt: new Date().toISOString(),
      headers: {
        authorization: rawAuth || null,
        'user-agent': req.headers['user-agent'] || null,
        'content-type': req.headers['content-type'] || null
      },
      tokenParam,
      body: lead
    };

    // Resolve user_id
    const map = await db.query(
      `SELECT user_id FROM olx.leads_configs WHERE token_path = $1 LIMIT 1`,
      [tokenParam]
    );
    const userId = map.rows[0]?.user_id || null;
    if (!userId) {
      res.setHeader('X-Response-Id', responseId);
      return res.status(400).json({ error: 'unknown_token', message: 'Token de lead não mapeado para usuário', responseId });
    }

    // ----------------- Normalizações básicas -----------------
    const srcLower = String(lead.source ?? '').toLowerCase().trim();
    const origin   = (srcLower === 'whatsapp') ? 'WhatsApp' : 'OLX';

    const createdAtIso =
      lead.createdAt && !isNaN(Date.parse(lead.createdAt))
        ? new Date(lead.createdAt).toISOString()
        : null;

    // saneamentos leves
    if (typeof lead.name === 'string')   lead.name   = lead.name.trim();
    if (typeof lead.email === 'string')  lead.email  = lead.email.trim();
    if (typeof lead.phone === 'string')  lead.phone  = lead.phone.replace(/\s+/g, '').trim();

    const listId = (lead.listId != null) ? String(lead.listId) : null;
    const linkAd = lead.linkAd || (listId ? `https://www.olx.com.br/vi/${encodeURIComponent(listId)}.htm` : null);

    // chave de idempotência (mantida)
    const uniq = uniqKey({
      userId,
      listId: listId,
      adId: lead.adId,
      createdAt: createdAtIso,
      externalId: lead.externalId,
      email: lead.email,
      phone: lead.phone
    });

    // ----------------- Upsert do ANÚNCIO (sempre que houver listId) -----------------
    let anuncioId = null;
    if (listId) {
      const tituloFromLead = String(ads.subject ?? '—');      // nunca null
      const statusFromLead = String(ads.status  ?? 'published');

      const upsertSql = `
        INSERT INTO olx.anuncios (user_id, list_id, origem, ad_id, titulo, url, status, raw_payload, updated_at)
        VALUES ($1, $2, 'OLX', $3, $4, $5, $6, $7, timezone('America/Sao_Paulo', now()))
        ON CONFLICT (user_id, list_id) DO UPDATE
        SET  origem      = COALESCE(olx.anuncios.origem, 'OLX'),
             ad_id       = COALESCE(EXCLUDED.ad_id,   olx.anuncios.ad_id),
             titulo      = COALESCE(EXCLUDED.titulo,  olx.anuncios.titulo),
             url         = COALESCE(EXCLUDED.url,     olx.anuncios.url),
             status      = COALESCE(EXCLUDED.status,  olx.anuncios.status),
             raw_payload = EXCLUDED.raw_payload,
             updated_at  = timezone('America/Sao_Paulo', now())
        RETURNING id;
      `;
      const upsertParams = [
        userId,
        listId,
        (lead.adId ?? null),
        tituloFromLead,
        linkAd,
        statusFromLead,
        lead
      ];

      const upsert = await db.query(upsertSql, upsertParams);
      anuncioId = upsert.rows[0]?.id ?? null;
    }

    // ----------------- Persistir CONTATO (com anuncio_id quando houver) -----------------
    await db.query(`
      INSERT INTO olx.contatos
        (user_id, source, origin, anuncio_id, ad_id, list_id, link_ad,
         nome, email, telefone, mensagem, created_at_utc, external_id,
         ads_category, ads_subject, ads_body, ads_type, ads_price, ads_zipcode,
         ads_regdate, ads_mileage, ads_carcolor, ads_fuel, ads_car_steering,
         ads_exchange, ads_owner, ads_financial, ads_financial_status,
         ads_vehicle_brand, ads_vehicle_model, ads_vehicle_version,
         ads_cubiccms, ads_moto_features,
         raw_payload, uniq_key)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,$13,
         $14,$15,$16,$17,$18,$19,
         $20,$21,$22,$23,$24,
         $25,$26,$27,$28,
         $29,$30,$31,
         $32,$33,
         $34,$35)
      ON CONFLICT (uniq_key) DO NOTHING
    `, [
      userId,
      (lead.source ?? 'OLX'),
      origin,
      anuncioId,                      // vínculo com anúncios (pode ser null se não houver listId)
      (lead.adId ?? null),
      listId,
      linkAd,

      (lead.name ?? null),
      (lead.email ?? null),
      (lead.phone ?? null),
      String(lead.message ?? ''),     // sempre string
      createdAtIso,
      (lead.externalId ?? null),

      // --- TIPOS CONFORME SCHEMA ---
      toIntOrNull(ads.category),      // INTEGER
      (ads.subject ?? null),
      (ads.body ?? null),
      (ads.type ?? null),
      toIntOrNull(ads.price),         // INTEGER
      (ads.zipcode ?? null),

      (ads.regdate ?? null),
      toIntOrNull(ads.mileage),       // INTEGER
      (ads.carcolor ?? null),         // TEXT
      (ads.fuel ?? null),             // TEXT
      (ads.car_steering ?? null),     // TEXT (mantido por segurança)

      (ads.exchange ?? null),         // TEXT (mantido por segurança)
      (ads.owner ?? null),            // TEXT (mantido por segurança)
      splitPipeToArray(ads.financial),
      (ads.financial_status ?? null), // TEXT (mantido por segurança)

      (ads.vehicle_brand ?? null),    // TEXT (mantido por segurança)
      (ads.vehicle_model ?? null),    // TEXT (mantido por segurança)
      (ads.vehicle_version ?? null),  // TEXT (mantido por segurança)

      (ads.cubiccms ?? null),         // TEXT (mantido por segurança)
      splitPipeToArray(ads.moto_features),

      lead,  // raw_payload JSONB
      uniq
    ]);

    console.log('📩 OLX Lead recebido e persistido (ou ignorado por idempotência)', {
      tokenParam,
      userId,
      listId,
      adId: lead.adId,
      createdAt: createdAtIso,
      hasAdsInfo: !!lead.adsInfo,
      anuncioId
    });

    res.setHeader('X-Response-Id', responseId);
    return res.json({ ok: true, responseId });
  } catch (err) {
    console.error('lead_webhook_failed:', err);
    res.setHeader('X-Response-Id', responseId);
    return res.status(500).json({ error: 'lead_webhook_failed', details: err.message, responseId });
  }
});


export default router;
