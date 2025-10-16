import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z, ZodError } from 'zod';
import db from '../db.mjs';
import env from '../env.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

/**
 * POST /auth/login
 * Autentica usuário e retorna token JWT
 */
router.post('/login', async (req, res, next) => {
  try {
    // normaliza antes de validar
    const { email, senha } = loginSchema.parse({
      email: (req.body?.email ?? '').toString().trim().toLowerCase(),
      senha: (req.body?.senha ?? '').toString(),
    });

    // busca usuário
    const { rows } = await db.query(
      `SELECT id, nome, email, TRIM(password_hash) AS senha_hash
         FROM olx.usuarios
        WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    // não encontrado → 401 (não cria!)
    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos',
      });
    }

    // valida senha
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos',
      });
    }

    // gera JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES }
    );

    return res.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'invalid_body', details: error.issues });
    }
    next(error);
  }
});

/**
 * POST /auth/register
 * Cadastro de novo usuário com geração automática de webhook token
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, senha, nome } = z.object({
      email: z.string().email('Email inválido'),
      senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      nome: z.string().optional(),
    }).parse(req.body);

    // Verifica se usuário já existe
    const existing = await db.query(
      'SELECT id FROM olx.usuarios WHERE LOWER(email) = LOWER($1)',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Usuário já existe',
        message: 'Este email já está cadastrado'
      });
    }

    // Cria usuário
    const senhaHash = await bcrypt.hash(senha, 10);
    const userResult = await db.query(
      'INSERT INTO olx.usuarios (email, password_hash, nome) VALUES ($1, $2, $3) RETURNING id, email, nome',
      [email.toLowerCase(), senhaHash, nome || email.split('@')[0]]
    );

    const user = userResult.rows[0];

    // Gera token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nome: user.nome,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES }
    );

    // Gera webhook token
    const crypto = await import('crypto');
    const webhookToken = crypto.randomBytes(24).toString('base64url');
    const webhookUrl = `${env.FRONT_BASE_URL.replace(/:\d+$/, ':4000')}/webhooks/olx/lead/${webhookToken}`;

    // Salva config do webhook
    await db.query(
      'INSERT INTO olx.leads_configs (user_id, token_path) VALUES ($1, $2)',
      [user.id, webhookToken]
    );

    res.status(201).json({
      token,
      webhookToken,
      webhookUrl,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/forgot
 * Solicita recuperação de senha
 */
router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = z.object({
      email: z.string().email('Email inválido'),
    }).parse(req.body);

    // Busca usuário
    const result = await db.query(
      'SELECT id FROM olx.usuarios WHERE LOWER(email) = LOWER($1)',
      [email.toLowerCase()]
    );

    // Sempre retorna sucesso (não revela se email existe)
    if (result.rows.length === 0) {
      return res.json({ ok: true });
    }

    const userId = result.rows[0].id;

    // Gera token de reset
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salva token
    await db.query(
      `INSERT INTO olx.password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, resetToken, expiresAt]
    );

    // DEV MODE: retorna URL
    const appBaseUrl = env.FRONT_BASE_URL;
    const resetUrl = `${appBaseUrl}/reset-password?token=${resetToken}`;

    console.log('🔑 Reset password URL:', resetUrl);

    res.json({
      ok: true,
      resetUrl, // Em produção, isso seria enviado por email
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/reset
 * Redefine senha com token de recuperação
 */
router.post('/reset', async (req, res, next) => {
  try {
    const { token, novaSenha } = z.object({
      token: z.string().min(1),
      novaSenha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    }).parse(req.body);

    // Busca token válido
    const result = await db.query(
      `SELECT user_id FROM olx.password_resets
       WHERE token = $1
         AND expires_at > NOW()
         AND used_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Token inválido',
        message: 'Token de recuperação inválido ou expirado'
      });
    }

    const userId = result.rows[0].user_id;

    // Atualiza senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await db.query(
      'UPDATE olx.usuarios SET password_hash = $1 WHERE id = $2',
      [senhaHash, userId]
    );

    // Marca token como usado
    await db.query(
      'UPDATE olx.password_resets SET used_at = NOW() WHERE token = $1',
      [token]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Retorna dados do usuário autenticado
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    res.json({
      id: req.user.id,
      email: req.user.email,
      nome: req.user.nome,
    });
  } catch (error) {
    next(error);
  }
});

export default router;