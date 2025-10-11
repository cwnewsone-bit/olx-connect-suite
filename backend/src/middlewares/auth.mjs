import jwt from 'jsonwebtoken';
import env from '../env.mjs';

/**
 * Middleware de autenticação JWT
 * Extrai e valida o token Bearer, popula req.user
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token não fornecido',
      message: 'Autenticação necessária'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Valida estrutura mínima do payload
    if (!decoded.id || !decoded.email) {
      throw new Error('Token inválido: estrutura incorreta');
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome || null,
    };
    
    next();
  } catch (error) {
    console.error('Erro na validação do token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Faça login novamente'
      });
    }
    
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Autenticação falhou'
    });
  }
}
