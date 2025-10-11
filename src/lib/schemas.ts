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
  status: z.string(),
  last_renovacao_at: z.string().datetime().nullable().optional(),
  dias_online: z.number(),
});

export type Anuncio = z.infer<typeof AnuncioSchema>;

export const ContatoSchema = z.object({
  user_id: z.string().uuid(),
  contato_id: z.string().uuid(),
  quando: z.string().datetime().nullable().optional(),
  nome: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  mensagem: z.string(),
  chat_id: z.string(),
  message_id: z.string(),
  sender_type: z.enum(['buyer', 'account', 'system']),
  origin: z.enum(['buyer', 'seller']),
  anuncio_id: z.string().uuid(),
  anuncio_titulo: z.string(),
  anuncio_url: z.string().url().nullable().optional(),
  categoria: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  status: z.string(),
});

export type Contato = z.infer<typeof ContatoSchema>;
