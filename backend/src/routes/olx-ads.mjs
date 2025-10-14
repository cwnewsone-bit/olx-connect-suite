// routes/olx-ads.mjs
import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.mjs';
import { getOlxAccessTokenForUser } from '../services/olx-conexoes.mjs';
import db from '../db.mjs';

const router = express.Router();

const BASE_PUBLISHED = 'https://apps.olx.com.br/autoupload/v1/published';
const BASE_AD = 'https://apps.olx.com.br/autoupload/ads';

// ---------------------- Schemas ----------------------
const listQuerySchema = z.object({
  status: z.enum(['published', 'sold', 'deleted_sold']).optional().default('published'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(200),
  page_token: z.string().min(1).optional(),
  preset: z.enum(['sold_all']).optional(),
});

// ---------------------- Helpers para listid ----------------------
function normalizeListingItem(it) {
  const listIdRaw = it?.list_id ?? it?.listId ?? null;
  const listId = listIdRaw != null ? String(listIdRaw) : null;

  // Nunca deixar nulo (evita NOT NULL no banco)
  const titulo = String(it?.title ?? it?.subject ?? '—');
  const status = String(it?.status ?? 'published');

  // Se não vier URL na listagem, monta uma padrão pelo listId
  const url =
    it?.url ??
    (listId ? `https://www.olx.com.br/vi/${encodeURIComponent(listId)}.htm` : null);

  return { listId, titulo, status, url, raw: it ?? null };
}

async function upsertAnuncioFromListing(userId, item) {
  const norm = normalizeListingItem(item);
  if (!norm.listId) return false;

  await db.query(
    `
    INSERT INTO olx.anuncios (user_id, list_id, origem, titulo, url, status, raw_payload, updated_at)
    VALUES ($1, $2, 'OLX', $3, $4, $5, $6, timezone('America/Sao_Paulo', now()))
    ON CONFLICT (user_id, list_id) DO UPDATE
    SET  origem      = COALESCE(olx.anuncios.origem, 'OLX'),
         titulo      = COALESCE(EXCLUDED.titulo,  olx.anuncios.titulo),
         url         = COALESCE(EXCLUDED.url,     olx.anuncios.url),
         status      = COALESCE(EXCLUDED.status,  olx.anuncios.status),
         raw_payload = EXCLUDED.raw_payload,
         updated_at  = timezone('America/Sao_Paulo', now())
    `,
    [userId, norm.listId, norm.titulo, norm.url, norm.status, norm.raw]
  );

  return true;
}


// ---------------------- NOVAS ROTAS: sincronização ----------------------
// GET /api/olx/ads/sync-published?status=published&pages=3&fetch_size=200
// - Vasculha /v1/published e faz upsert dos anúncios em olx.anuncios (por user_id + list_id)
router.get('/api/olx/ads/sync-published', authMiddleware, async (req, res) => {
  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);
    const status = String(req.query.status ?? 'published');
    const maxPages = Math.min(parseInt(req.query.pages ?? '3', 10), 20);
    const pageSize = Math.min(parseInt(req.query.fetch_size ?? '200', 10), 200);

    const headers = { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' };

    let pageToken = null;
    let imported = 0, pages = 0;

    while (pages < maxPages) {
      const url = new URL(BASE_PUBLISHED);
      url.searchParams.set('fetch_size', String(pageSize));
      url.searchParams.set('ads_status', status);
      if (pageToken) url.searchParams.set('page_token', pageToken);

      const r = await axios.get(url.toString(), { headers, timeout: 30000, validateStatus: () => true });
      if (r.status !== 200) {
        return res.status(r.status).json({ error: 'published_fetch_failed', at_page: pages+1, details: r.data });
      }

      const items = Array.isArray(r.data?.data) ? r.data.data : [];
      for (const it of items) {
        const ok = await upsertAnuncioFromListing(req.user.id, it);
        if (ok) imported++;
      }

      pageToken = r.data?.next_token ?? null;
      if (!pageToken) break;
      pages++;
    }

    return res.json({ ok: true, status, pages_scanned: pages+1, imported });
  } catch (err) {
    return res.status(500).json({ error: 'ads_sync_failed', details: err?.message || 'unknown_error' });
  }
});

// POST /api/olx/ads/sync-one/:list_id
// - Busca **detalhe** do anúncio; se falhar, tenta localizar no /published;
// - Upserta 1 anúncio no banco.
router.post('/api/olx/ads/sync-one/:list_id', authMiddleware, async (req, res) => {
  const listId = String(req.params.list_id);

  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);

    // tenta detalhe
    const detail = await axios.get(`${BASE_AD}/${encodeURIComponent(listId)}`, {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
      timeout: 30000, validateStatus: () => true,
    });

    if (detail.status >= 200 && detail.status < 300) {
      await upsertAnuncioFromListing(req.user.id, { ...detail.data, list_id: listId });
      return res.json({ ok: true, mode: 'detail', list_id: listId });
    }

    // fallback: published
    const r = await axios.get(`${BASE_PUBLISHED}?fetch_size=200&ads_status=published`, {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
      timeout: 30000, validateStatus: () => true,
    });

    if (r.status === 200 && Array.isArray(r.data?.data)) {
      const found = r.data.data.find(it => String(it?.list_id) === listId) || null;
      if (found) {
        await upsertAnuncioFromListing(req.user.id, found);
        return res.json({ ok: true, mode: 'listing', list_id: listId });
      }
    }

    return res.status(404).json({ error: 'not_found', list_id: listId });
  } catch (err) {
    return res.status(500).json({ error: 'ads_sync_one_failed', details: err?.message || 'unknown_error' });
  }
});

// ---------------------- Rotas já existentes ----------------------
router.get('/api/olx/ads', authMiddleware, async (req, res) => {
  const parse = listQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({
      error: 'invalid_query',
      details: parse.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const { status, limit, page_token, preset } = parse.data;

  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);

    async function fetchPage(ads_status, pageToken) {
      const url = new URL(BASE_PUBLISHED);
      url.searchParams.set('fetch_size', String(limit));
      url.searchParams.set('ads_status', ads_status);
      if (pageToken) url.searchParams.set('page_token', pageToken);

      const { data } = await axios.get(url.toString(), {
        headers: { Authorization: `Bearer ${access_token}` },
        timeout: 30000,
      });

      return {
        items: Array.isArray(data?.data) ? data.data : [],
        next_token: data?.next_token ?? null,
      };
    }

    if (preset === 'sold_all') {
      const [soldRes, deletedSoldRes] = await Promise.all([
        fetchPage('sold', page_token),
        fetchPage('deleted_sold', undefined),
      ]);

      const seen = new Set();
      const merged = [...soldRes.items, ...deletedSoldRes.items].filter(it => {
        const key = String(it?.list_id ?? it?.id ?? Math.random());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return res.json({
        status: 'sold_all',
        items: merged,
        next_token: soldRes.next_token,
        count: merged.length,
      });
    }

    const page = await fetchPage(status, page_token);
    return res.json({
      status,
      items: page.items,
      next_token: page.next_token,
      count: page.items.length,
    });
  } catch (err) {
    const msg = err?.message || '';
    if (msg === 'no_olx_connection') return res.status(412).json({ error: 'no_olx_connection' });
    if (msg === 'no_access_token')  return res.status(412).json({ error: 'no_access_token' });
    if (msg === 'token_expired')     return res.status(401).json({ error: 'token_expired' });

    const statusCode = err?.response?.status || 500;
    return res.status(statusCode).json({
      error: 'failed_fetching_ads',
      details: err?.response?.data ?? msg,
    });
  }
});

router.get('/api/olx/ads/:list_id', authMiddleware, async (req, res) => {
  const { list_id } = req.params;
  const debug = req.query.debug === '1';

  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);
    const baseUrl = `${BASE_AD}/${encodeURIComponent(list_id)}`;
    const common = {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'ResponderOLX/1.0',
      },
      validateStatus: () => true,
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const jitter = (ms) => ms + Math.floor(Math.random()*120);
    const transient = (s) => [502,503,500,429].includes(s);

    const doCall = async (useQueryToken = false) => {
      const url = useQueryToken ? `${baseUrl}?access_token=${encodeURIComponent(access_token)}` : baseUrl;
      const r = await axios.get(url, common);
      r._usedUrl = url;
      return r;
    };

    let resp, attempt = 0;
    for (; attempt < 3; attempt++) {
      resp = await doCall(false);
      if (!transient(resp.status)) break;
      await sleep(jitter(300 * (attempt + 1)));
    }
    if (transient(resp.status)) {
      for (; attempt < 5; attempt++) {
        resp = await doCall(true);
        if (!transient(resp.status)) break;
        await sleep(jitter(400 * (attempt - 2)));
      }
    }

    if (resp.status >= 200 && resp.status < 300) {
      return res.json({ list_id, ...(resp.data || {}) });
    }

    const listUrl = new URL(BASE_PUBLISHED);
    listUrl.searchParams.set('fetch_size', '200');
    listUrl.searchParams.set('ads_status', 'published');

    const listResp = await axios.get(listUrl.toString(), {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
      timeout: 30000, validateStatus: () => true,
    });

    let fallbackItem = null;
    if (listResp.status === 200 && Array.isArray(listResp.data?.data)) {
      fallbackItem = listResp.data.data.find(it => String(it?.list_id) === String(list_id)) || null;
    }

    const cfRay = resp?.headers?.['cf-ray'] || resp?.headers?.['CF-RAY'];

    if (fallbackItem) {
      return res.status(resp.status || 503).json({
        error: 'detail_unavailable_fallback_used',
        list_id,
        fallback: true,
        item: fallbackItem,
        upstream: {
          status: resp.status,
          statusText: resp.statusText || null,
          ray: cfRay || null,
          body: typeof resp.data === 'string' ? resp.data : resp.data || null,
        },
        meta: debug ? { usedUrl: resp._usedUrl, listUrl: listUrl.toString() } : undefined,
      });
    }

    return res.status(resp.status || 503).json({
      error: 'failed_fetching_ad_detail',
      status: resp.status,
      statusText: resp.statusText || null,
      ray: cfRay || null,
      details: typeof resp.data === 'string' ? resp.data : resp.data || null,
      meta: debug ? { usedUrl: resp._usedUrl } : undefined,
    });

  } catch (err) {
    return res.status(500).json({
      error: 'failed_fetching_ad_detail',
      status: 500,
      statusText: 'Internal Server Error',
      details: err?.message || 'unknown_error',
      meta: debug ? { url: `${BASE_AD}/${encodeURIComponent(req.params.list_id)}` } : undefined,
    });
  }
});

router.get('/api/olx/ads/by-list-id/:list_id', authMiddleware, async (req, res) => {
  const listId = String(req.params.list_id);
  const debug = req.query.debug === '1';
  const maxPages = Math.min(Number(req.query.max_pages ?? 5), 20);
  const pageSize = Math.min(Number(req.query.page_size ?? 200), 200);

  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);

    async function findInPublished() {
      let pageToken = req.query.page_token ? String(req.query.page_token) : null;
      let pages = 0;
      while (pages < maxPages) {
        const url = new URL(BASE_PUBLISHED);
        url.searchParams.set('fetch_size', String(pageSize));
        url.searchParams.set('ads_status', 'published');
        if (pageToken) url.searchParams.set('page_token', pageToken);

        const r = await axios.get(url.toString(), {
          headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
          timeout: 30000, validateStatus: () => true
        });

        if (r.status !== 200) {
          return { error: { status: r.status, body: r.data }, item: null, next_token: null, pages };
        }

        const items = Array.isArray(r.data?.data) ? r.data.data : [];
        const found = items.find(it => String(it?.list_id) === listId) || null;
        if (found) {
          return { error: null, item: found, next_token: r.data?.next_token ?? null, pages: pages + 1 };
        }

        pageToken = r.data?.next_token ?? null;
        if (!pageToken) break;
        pages++;
      }
      return { error: null, item: null, next_token: null, pages };
    }

    const search = await findInPublished();

    if (search.item) {
      let detail = null;
      try {
        const d = await axios.get(`${BASE_AD}/${encodeURIComponent(listId)}`, {
          headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'ResponderOLX/1.0' },
          timeout: 30000, validateStatus: () => true
        });
        if (d.status >= 200 && d.status < 300) detail = d.data || null;
      } catch { /* ignore */ }

      return res.json({
        mode: detail ? 'listing+detail' : 'listing_only',
        list_id: listId,
        item: search.item,
        detail,
        scanned_pages: search.pages
      });
    }

    return res.status(404).json({
      error: 'not_found_on_published',
      list_id: listId,
      scanned_pages: search.pages,
      upstream: search.error || null
    });

  } catch (err) {
    return res.status(500).json({ error: 'by_list_id_failed', message: err?.message || 'unknown_error' });
  }
});

router.get('/api/olx/ads/detail-or-list/:list_id', authMiddleware, async (req, res) => {
  const listId = String(req.params.list_id);
  const debug = req.query.debug === '1';
  const pageSize = 200;
  const maxPages = 5;

  try {
    const { access_token } = await getOlxAccessTokenForUser(req.user.id);

    const headers = {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/json',
      'User-Agent': 'ResponderOLX/1.0',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const jitter = (ms) => ms + Math.floor(Math.random()*120);
    const transient = (s) => [502,503,500,429].includes(s);

    const baseDetailUrl = `${BASE_AD}/${encodeURIComponent(listId)}`;
    const getDetail = async (useQueryToken = false) => {
      const url = useQueryToken ? `${baseDetailUrl}?access_token=${encodeURIComponent(access_token)}` : baseDetailUrl;
      const r = await axios.get(url, { headers, timeout: 30000, validateStatus: () => true });
      r._usedUrl = url;
      return r;
    };

    let detailResp, attempt = 0;
    for (; attempt < 3; attempt++) {
      detailResp = await getDetail(false);
      if (!transient(detailResp.status)) break;
      await sleep(jitter(300 * (attempt + 1)));
    }
    if (transient(detailResp.status)) {
      for (; attempt < 5; attempt++) {
        detailResp = await getDetail(true);
        if (!transient(detailResp.status)) break;
        await sleep(jitter(400 * (attempt - 2)));
      }
    }

    if (detailResp.status >= 200 && detailResp.status < 300) {
      const body = detailResp.data || {};
      return res.json({
        source: 'detail',
        list_id: listId,
        status: body?.status ?? null,
        id: body?.id ?? null,
        url: body?.url ?? null,
        last_update: body?.last_update ?? null,
        raw: debug ? body : undefined,
        meta: debug ? { usedUrl: detailResp._usedUrl, status: detailResp.status } : undefined,
      });
    }

    let pageToken = null;
    let pages = 0;
    let found = null;

    while (pages < maxPages) {
      const listUrl = new URL(BASE_PUBLISHED);
      listUrl.searchParams.set('fetch_size', String(pageSize));
      listUrl.searchParams.set('ads_status', 'published');
      if (pageToken) listUrl.searchParams.set('page_token', pageToken);

      const r = await axios.get(listUrl.toString(), { headers, timeout: 30000, validateStatus: () => true });
      if (r.status !== 200) {
        return res.status(detailResp.status || 503).json({
          error: 'failed_fetching_ad_detail',
          status: detailResp.status,
          statusText: detailResp.statusText || null,
          details: typeof detailResp.data === 'string' ? detailResp.data : detailResp.data || null,
          upstream_list_status: r.status,
        });
      }

      const items = Array.isArray(r.data?.data) ? r.data.data : [];
      found = items.find(it => String(it?.list_id) === listId) || null;
      if (found) break;

      pageToken = r.data?.next_token ?? null;
      if (!pageToken) break;
      pages++;
    }

    if (found) {
      return res.json({
        source: 'listing',
        list_id: listId,
        status: found.status ?? null,
        id: found.id ?? null,
        url: null,
        last_update: null,
        raw: debug ? found : undefined,
        scanned_pages: pages + 1,
        meta: debug ? { detailStatus: detailResp.status } : undefined,
      });
    }

    return res.status(404).json({ error: 'not_found', list_id: listId });

  } catch (err) {
    return res.status(500).json({ error: 'detail_or_list_failed', message: err?.message || 'unknown_error' });
  }
});

export default router;
