// backend/src/routes/wpp-messages.mjs
import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.mjs';
import { evoSendText, evoSendAudio, evoSendMedia, evoSendLocation, evoSendList, evoSendContact } from '../services/evolution.mjs';

const router = express.Router();

// Schemas de validação
const textSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/, 'Formato: 55DDD9XXXXXXXX'),
  text: z.string().min(1).max(4096),
});

const audioUrlSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/),
  audioUrl: z.string().url(),
});

const mediaSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/),
  mediaUrl: z.string().url(),
  caption: z.string().max(1024).optional(),
});

const locationSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().max(256).optional(),
  address: z.string().max(512).optional(),
});

const listSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/),
  title: z.string().max(256).optional(),
  text: z.string().min(1).max(1024),
  buttonText: z.string().min(1).max(20),
  sections: z.array(z.object({
    title: z.string().max(24).optional(),
    rows: z.array(z.object({
      id: z.string().max(200),
      title: z.string().max(24),
      description: z.string().max(72).optional(),
    })).min(1).max(10),
  })).min(1).max(10),
});

const contactSchema = z.object({
  to: z.string().regex(/^55\d{10,11}$/),
  contact: z.object({
    fullName: z.string().min(1).max(256),
    org: z.string().max(256).optional(),
    phones: z.array(z.object({
      number: z.string().regex(/^55\d{10,11}$/),
      type: z.enum(['WORK', 'HOME', 'CELL']).optional(),
    })).min(1),
  }),
});

// POST /api/wpp/:instanceName/messages/text
router.post('/:instanceName/messages/text', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = textSchema.parse(req.body);
    
    const result = await evoSendText(instanceName, body.to, body.text);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wpp/:instanceName/messages/audio
router.post('/:instanceName/messages/audio', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = audioUrlSchema.parse(req.body);
    
    const result = await evoSendAudio(instanceName, body.to, body.audioUrl);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wpp/:instanceName/messages/media
router.post('/:instanceName/messages/media', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = mediaSchema.parse(req.body);
    
    const result = await evoSendMedia(instanceName, body.to, body.mediaUrl, body.caption);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wpp/:instanceName/messages/location
router.post('/:instanceName/messages/location', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = locationSchema.parse(req.body);
    
    const result = await evoSendLocation(instanceName, body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wpp/:instanceName/messages/list
router.post('/:instanceName/messages/list', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = listSchema.parse(req.body);
    
    const result = await evoSendList(instanceName, body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wpp/:instanceName/messages/contact
router.post('/:instanceName/messages/contact', authMiddleware, async (req, res, next) => {
  try {
    const { instanceName } = req.params;
    const body = contactSchema.parse(req.body);
    
    const result = await evoSendContact(instanceName, body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
