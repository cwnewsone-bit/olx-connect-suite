import { z } from 'zod';

export const MeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nome: z.string().nullable().optional(),
});

export type Me = z.infer<typeof MeSchema>;

export const OlxStatusSchema = z.object({
  connected: z.boolean(),
  provider_user_email: z.string().email().nullable().optional(),
  obtained_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export type OlxStatus = z.infer<typeof OlxStatusSchema>;

export const AnuncioSchema = z.object({
  user_id: z.string().uuid(),
  anuncio_id: z.string().uuid(),
  foto: z.string().url().nullable().optional(),
  titulo: z.string(),
  url: z.string().url().nullable().optional(),
  categoria: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  status: z.string(),              // valor canônico da OLX
  status_pt: z.string().optional(),// NOVO: traduzido pela view
  last_renovacao_at: z.string().datetime().nullable().optional(),
  dias_online: z.number(),
});

export type Anuncio = z.infer<typeof AnuncioSchema>;

export const ContatoSchema = z.object({
  user_id: z.string().uuid(),
  contato_id: z.string().uuid(),

  // pode vir null
  quando: z.string().datetime().nullable().optional(),

  // podem vir vazios/null
  nome: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  mensagem: z.string().nullable().optional(),

  // podem vir null
  chat_id: z.string().nullable().optional(),
  message_id: z.string().nullable().optional(),
  sender_type: z.enum(['buyer', 'account', 'system']).nullable().optional(),

  // na prática pode vir 'OLX', 'WhatsApp', 'buyer' etc.
  origin: z.string().nullable().optional(),

  // podem vir null quando não há match com anúncio
  anuncio_id: z.string().uuid().nullable().optional(),
  anuncio_titulo: z.string().nullable().optional(),
  anuncio_url: z.string().url().nullable().optional(),
  categoria: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type Contato = z.infer<typeof ContatoSchema>;
