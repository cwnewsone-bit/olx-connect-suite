import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
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
    const { email, senha } = loginSchema.parse(req.body);
    
    // Busca usuário
    const result = await db.query(
      'SELECT id, email, nome, senha_hash FROM olx.usuarios WHERE email = $1',
      [email.toLowerCase()]
    );
    
    let user = result.rows[0];
    
    // Se não existir, cria novo usuário (auto-registro)
    if (!user) {
      const senhaHash = await bcrypt.hash(senha, 10);
      const insertResult = await db.query(
        'INSERT INTO olx.usuarios (email, senha_hash, nome) VALUES ($1, $2, $3) RETURNING id, email, nome',
        [email.toLowerCase(), senhaHash, email.split('@')[0]]
      );
      user = insertResult.rows[0];
      user.senha_hash = senhaHash;
    }
    
    // Valida senha
    if (!(await bcrypt.compare(senha, user.senha_hash))) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }
    
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
    
    res.json({ token });
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
