// backend/src/routes/contacts.mjs
import express from 'express';
import { z } from 'zod';
import db from '../db.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';

const router = express.Router();

const contactSchema = z.object({
  phone: z.string().regex(/^55\d{10,11}$/, 'Formato: 55DDD9XXXXXXXX'),
  name: z.string().min(1).max(256),
});

// POST /api/contacts - Salvar contato
router.post('/contacts', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const body = contactSchema.parse(req.body);

    await db.query(
      `INSERT INTO wpp.contacts (user_id, phone, name, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (user_id, phone) 
       DO UPDATE SET name = excluded.name, updated_at = now()`,
      [userId, body.phone, body.name]
    );

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
