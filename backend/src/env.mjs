// backend/src/env.mjs
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),

  FRONT_BASE_URL: z.string().url({ message: 'Required (valid URL)' }),

  CORS_ORIGINS: z
    .string({ required_error: 'Required' })
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES: z.string().default('7d'),

  // ✅ aceita postgres://… corretamente
  DATABASE_URL: z
    .string({ required_error: 'Required' })
    .refine((v) => v.startsWith('postgres://'), 'DATABASE_URL deve começar com postgres://'),

  OLX_CLIENT_ID: z.string().min(1),
  OLX_CLIENT_SECRET: z.string().min(1),
  OLX_REDIRECT_URI: z.string().url({ message: 'Required (valid URL)' }),
  DEFAULT_SCOPE: z.string().default('basic_user_info autoupload autoservice chat'),
  OLX_STATE_SECRET: z.string().min(32, 'OLX_STATE_SECRET deve ter no mínimo 32 caracteres'),

  ALLOW_START_WITH_UID: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => `${v ?? ''}`.trim() === '1'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Erro na validação das variáveis de ambiente:');
  for (const e of parsed.error.errors) {
    console.error(`  - ${e.path.join('.')}: ${e.message}`);
  }
  process.exit(1);
}

export default parsed.data;
