import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import env from './env.mjs';
import authRoutes from './routes/auth.mjs';
import dataRoutes from './routes/data.mjs';
import olxOAuthRoutes from './routes/olx-oauth.mjs';

const app = express();

// Trust proxy (importante para rate limiting atrás de proxies)
app.set('trust proxy', 1);

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300,
  message: { error: 'Muitas requisições', message: 'Tente novamente em alguns instantes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Muitas tentativas de login', message: 'Tente novamente em 15 minutos' },
  skipSuccessfulRequests: true,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rotas
app.use('/auth', loginLimiter, authRoutes);
app.use('/api', dataRoutes);
app.use('/oauth', olxOAuthRoutes);
app.use('/rest/oauth2-credential', olxOAuthRoutes); // Callback OLX

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `${req.method} ${req.path} não existe`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  
  // Zod validation error
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      message: 'Verifique os dados enviados',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }
  
  // Axios error
  if (err.isAxiosError) {
    return res.status(502).json({
      error: 'Erro ao comunicar com serviço externo',
      message: 'Tente novamente em alguns instantes'
    });
  }
  
  // Database error
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      error: 'Erro de banco de dados',
      message: 'Verifique os dados enviados'
    });
  }
  
  // Generic error
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Ocorreu um erro inesperado'
  });
});

// Start server
const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✓ Servidor rodando na porta ${PORT}`);
  console.log(`✓ Frontend: ${env.FRONT_BASE_URL}`);
  console.log(`✓ CORS origins: ${env.CORS_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});
