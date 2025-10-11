import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  FRONT_BASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().transform(s => s.split(',').map(o => o.trim())),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES: z.string().default('7d'),
  
  DATABASE_URL: z.string().url().startsWith('postgres'),
  
  OLX_CLIENT_ID: z.string().min(1),
  OLX_CLIENT_SECRET: z.string().min(1),
  OLX_REDIRECT_URI: z.string().url(),
  DEFAULT_SCOPE: z.string().default('basic_user_info autoupload autoservice chat'),
  OLX_STATE_SECRET: z.string().min(32, 'OLX_STATE_SECRET deve ter no mínimo 32 caracteres'),
  ALLOW_START_WITH_UID: z.string().default('1').transform(v => v === '1'),
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Erro na validação das variáveis de ambiente:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export default env;
