import db from '../db.mjs';
import { parsePageSize } from '../utils.mjs';

/**
 * Lista contatos/leads com filtros e paginação
 */
export async function getContatos(userId, query = {}) {
  const { page, size, offset } = parsePageSize(query);
  
  // Período padrão: 30 dias
  const periodo = Math.max(1, Math.min(365, parseInt(query.periodo) || 30));
  
  let sql = `
    SELECT * FROM olx.v_contatos_list
    WHERE user_id = $1
      AND (quando IS NULL OR quando >= now() - ($2 || ' days')::interval)
  `;
  
  const params = [userId, periodo];
  let paramIndex = 3;
  
  // Filtro por anúncio
  if (query.anuncio_id) {
    sql += ` AND anuncio_id = $${paramIndex}`;
    params.push(query.anuncio_id);
    paramIndex++;
  }
  
  // Ordenação
  sql += ' ORDER BY quando DESC NULLS LAST';
  
  // Paginação
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(size, offset);
  
  const result = await db.query(sql, params);
  
  return result.rows;
}
