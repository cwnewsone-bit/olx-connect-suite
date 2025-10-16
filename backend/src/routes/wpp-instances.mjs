import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';
import { evoCreateInstance, evoGetInstance } from '../services/evolution.mjs';
import { BACKEND_PUBLIC_URL } from '../env.mjs';
import crypto from 'crypto';

const router = Router();

// Schema de validação para criação de instância
const createInstanceSchema = z.object({
  instanceName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, 'Instance name must be alphanumeric with _.- allowed'),
  number: z.string().regex(/^\d{10,15}$/, 'Number must be 10-15 digits (E.164 format without +)'),
  webhook: z.string().url().startsWith('https://').optional()
});

// GET /api/wpp/instances - Listar instâncias do usuário
router.get('/instances', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, instance_name, number, webhook, integration, 
              always_online, read_messages, read_status, created_at, updated_at
       FROM wpp.instances
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    return res.json({ ok: true, instances: rows });
  } catch (err) {
    console.error('Error listing instances:', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/wpp/:instanceName/status - Status e QR code de instância
router.get('/:instanceName/status', authMiddleware, async (req, res) => {
  try {
    const { instanceName } = req.params;

    // Verificar se instância pertence ao usuário
    const { rows: instRows } = await pool.query(
      'SELECT id FROM wpp.instances WHERE instance_name = $1 AND user_id = $2',
      [instanceName, req.userId]
    );

    if (instRows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Instance not found or unauthorized' });
    }

    // Consultar Evolution
    const evolutionData = await evoGetInstance(instanceName);

    return res.json({ ok: true, status: evolutionData });
  } catch (err) {
    console.error('Error fetching instance status:', err);
    if (err.response) {
      return res.status(err.response.status || 500).json({
        error: 'evolution_error',
        details: { status: err.response.status, message: err.response.data }
      });
    }
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /api/wpp/instances - Criar instância
router.post('/instances', authMiddleware, async (req, res) => {
  try {
    const validated = createInstanceSchema.parse(req.body);
    const { instanceName, number, webhook } = validated;

    // Verificar limite de 2 instâncias ativas por usuário
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) as count FROM wpp.instances WHERE user_id = $1',
      [req.userId]
    );

    if (parseInt(countRows[0].count) >= 2) {
      return res.status(400).json({
        error: 'limit_exceeded',
        message: 'Maximum 2 active instances per user'
      });
    }

    // Gerar token único para Evolution
    const token = crypto.randomBytes(32).toString('base64url');

    // Montar webhook URL (usar o fornecido ou fallback para BACKEND_PUBLIC_URL)
    const webhookUrl = webhook || `${BACKEND_PUBLIC_URL}/webhooks/evolution`;

    // Chamar Evolution para criar instância
    const evoPayload = {
      instanceName,
      token,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhookUrl, // Evolution requer "webhookUrl" ou "url", não "webhook"
      webhook_by_events: true,
      events: ['APPLICATION_STARTUP', 'MESSAGES_UPSERT', 'SEND_MESSAGE']
    };

    const evolutionResponse = await evoCreateInstance(evoPayload);

    // Persistir no banco
    const { rows } = await pool.query(
      `INSERT INTO wpp.instances 
       (user_id, instance_name, token, number, webhook, integration, always_online, read_messages, read_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, instance_name, number, webhook, created_at`,
      [req.userId, instanceName, token, number, webhookUrl, 'WHATSAPP-BAILEYS', true, true, true]
    );

    return res.status(201).json({
      ok: true,
      instance: rows[0],
      evolution: evolutionResponse
    });
  } catch (err) {
    console.error('Error creating instance:', err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }

    if (err.code === '23505') {
      return res.status(409).json({ error: 'duplicate', message: 'Instance name already exists' });
    }

    if (err.response) {
      return res.status(err.response.status || 500).json({
        error: 'evolution_error',
        details: { status: err.response.status, message: err.response.data }
      });
    }

    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;
