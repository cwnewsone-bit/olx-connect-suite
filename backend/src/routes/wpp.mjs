// backend/src/routes/wpp.mjs
import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import db from '../db.mjs';
import env from '../env.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';
import { evoCreateInstance } from '../services/evolution.mjs';

const router = express.Router();

const createInstanceSchema = z.object({
  instanceName: z.string().min(3).max(64)
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Use apenas letras, números, . _ -'),
  number: z.string().optional(),               // ex.: 55DDD9XXXXXXX
  webhook: z.string().url().optional(),
  // Flags opcionais (defaults sensatos)
  always_online: z.boolean().optional().default(true),
  read_messages: z.boolean().optional().default(true),
  read_status: z.boolean().optional().default(true),
});

// Valida URL absoluta; se quiser obrigar HTTPS, ative a verificação do protocolo
function buildValidWebhook(raw) {
  try {
    if (!raw) return undefined;
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return undefined;

    // 👉 Descomente esta linha para OBRIGAR HTTPS:
    // if (u.protocol !== 'https:') return undefined;

    return u.toString();
  } catch {
    return undefined;
  }
}

router.post('/instances', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id; // vem do JWT via authMiddleware
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const body = createInstanceSchema.parse(req.body);

    // Gera token randômico para Evolution
    const evoToken = crypto.randomBytes(24).toString('hex');

    // Webhook default se não enviaram e você quiser receber eventos
    const candidateWebhook =
      body.webhook ??
      (env.BACKEND_PUBLIC_URL ? `${env.BACKEND_PUBLIC_URL}/webhooks/evolution` : undefined);

    const webhookUrl = buildValidWebhook(candidateWebhook);

    // Monta payload mínimo/compatível com sua build Evolution
    const evoPayload = {
      instanceName: body.instanceName,
      token: evoToken,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      ...(body.number ? { number: body.number } : {}),

      // ✅ sua build aceita webhookUrl e também url; usamos webhookUrl como padrão
      ...(webhookUrl
        ? {
            webhookUrl: webhookUrl,            // principal aceito nos seus testes
            // url: webhookUrl,                 // fallback opcional (habilite se quiser)
            webhook_by_events: true,
            events: ['APPLICATION_STARTUP'],
          }
        : {}),

      // Demais flags (mantivemos como antes)
      reject_call: true,
      groups_ignore: true,
      always_online: body.always_online,
      read_messages: body.read_messages,
      read_status: body.read_status,
      websocket_enabled: false,
      rabbitmq_enabled: false,
      sqs_enabled: false,
    };

    // 1) Cria na Evolution
    const evoResp = await evoCreateInstance(evoPayload);

    // 2) Persiste localmente
    await db.query(
      `
      insert into wpp.instances
        (user_id, instance_name, token, number, webhook, integration,
         always_online, read_messages, read_status, created_at, updated_at)
      values
        ($1, $2, $3, $4, $5, 'WHATSAPP-BAILEYS',
         $6, $7, $8, now(), now())
      on conflict (instance_name)
      do update set
        token = excluded.token,
        number = excluded.number,
        webhook = excluded.webhook,
        always_online = excluded.always_online,
        read_messages = excluded.read_messages,
        read_status = excluded.read_status,
        updated_at = now()
      `,
      [
        userId,
        body.instanceName,
        evoToken,
        body.number ?? null,
        webhookUrl ?? null,
        body.always_online,
        body.read_messages,
        body.read_status,
      ]
    );

    // 3) Retorna sucesso com dados vindos da Evolution
    return res.status(201).json({
      ok: true,
      instance: {
        user_id: userId,
        instance_name: body.instanceName,
        webhook: webhookUrl ?? null,
      },
      evolution: evoResp, // costuma incluir status/qr
    });
  } catch (err) {
    // Normaliza alguns erros comuns (ex.: instância já existente na Evolution)
    const status = err?.response?.status;
    const data = err?.response?.data;
    if (status) {
      return res.status(status).json({
        error: 'evolution_error',
        details: data ?? String(err),
      });
    }
    next(err);
  }
});

export default router;
