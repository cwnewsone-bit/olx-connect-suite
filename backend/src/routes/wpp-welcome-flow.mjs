import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';

const router = Router();

// Schema de validação para welcome flow
const actionSchema = z.object({
  type: z.enum(['AVAILABILITY_CHECK', 'SEND_PHOTOS_REQUEST', 'SEND_ADDRESS_TEXT', 'OTHER_SEND_AUDIO']),
  text: z.string().optional(),
  mapsUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional()
});

const rowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional()
});

const sectionSchema = z.object({
  title: z.string().optional(),
  rows: z.array(rowSchema).min(1)
});

const listSchema = z.object({
  title: z.string().optional(),
  text: z.string(),
  buttonText: z.string(),
  sections: z.array(sectionSchema).min(1)
});

const welcomeFlowSchema = z.object({
  enabled: z.boolean(),
  audioUrl: z.string().url(),
  list: listSchema,
  actions: z.record(z.string(), actionSchema)
}).refine(data => {
  // Validar que todos os row.id têm uma action correspondente
  const rowIds = new Set();
  data.list.sections.forEach(section => {
    section.rows.forEach(row => rowIds.add(row.id));
  });
  
  for (const rowId of rowIds) {
    if (!data.actions[rowId]) {
      return false;
    }
  }
  
  return true;
}, { message: 'All row IDs must have a corresponding action' });

// GET /api/wpp/:instanceName/welcome-flow
router.get('/:instanceName/welcome-flow', authMiddleware, async (req, res) => {
  try {
    const { instanceName } = req.params;

    // Buscar instance_id e verificar ownership
    const { rows: instRows } = await pool.query(
      'SELECT id FROM wpp.instances WHERE instance_name = $1 AND user_id = $2',
      [instanceName, req.userId]
    );

    if (instRows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Instance not found or unauthorized' });
    }

    const instanceId = instRows[0].id;

    // Buscar welcome flow
    const { rows } = await pool.query(
      `SELECT enabled, audio_url, list_config, actions, created_at, updated_at
       FROM wpp.welcome_flows
       WHERE instance_id = $1`,
      [instanceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'No welcome flow configured' });
    }

    const flow = rows[0];
    return res.json({
      ok: true,
      flow: {
        enabled: flow.enabled,
        audioUrl: flow.audio_url,
        list: flow.list_config,
        actions: flow.actions,
        createdAt: flow.created_at,
        updatedAt: flow.updated_at
      }
    });
  } catch (err) {
    console.error('Error fetching welcome flow:', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PUT /api/wpp/:instanceName/welcome-flow
router.put('/:instanceName/welcome-flow', authMiddleware, async (req, res) => {
  try {
    const { instanceName } = req.params;
    const validated = welcomeFlowSchema.parse(req.body);

    // Buscar instance_id e verificar ownership
    const { rows: instRows } = await pool.query(
      'SELECT id FROM wpp.instances WHERE instance_name = $1 AND user_id = $2',
      [instanceName, req.userId]
    );

    if (instRows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Instance not found or unauthorized' });
    }

    const instanceId = instRows[0].id;

    // Upsert welcome flow
    const { rows } = await pool.query(
      `INSERT INTO wpp.welcome_flows (instance_id, enabled, audio_url, list_config, actions, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (instance_id)
       DO UPDATE SET
         enabled = EXCLUDED.enabled,
         audio_url = EXCLUDED.audio_url,
         list_config = EXCLUDED.list_config,
         actions = EXCLUDED.actions,
         updated_at = now()
       RETURNING id, enabled, audio_url, list_config, actions, created_at, updated_at`,
      [instanceId, validated.enabled, validated.audioUrl, JSON.stringify(validated.list), JSON.stringify(validated.actions)]
    );

    const flow = rows[0];
    return res.json({
      ok: true,
      flow: {
        enabled: flow.enabled,
        audioUrl: flow.audio_url,
        list: flow.list_config,
        actions: flow.actions,
        createdAt: flow.created_at,
        updatedAt: flow.updated_at
      }
    });
  } catch (err) {
    console.error('Error saving welcome flow:', err);

    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }

    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;
