import db from '../db.mjs';
import { parsePageSize } from '../utils.mjs';

/**
 * Lista anúncios com filtros e paginação
 */
export async function getAnuncios(userId, query = {}) {
  const { page, size, offset } = parsePageSize(query);
  
  let sql = 'SELECT * FROM olx.v_anuncios_list WHERE user_id = $1';
  const params = [userId];
  let paramIndex = 2;
  
  // Filtro por status (múltiplos valores separados por vírgula)
  if (query.status) {
    const statusList = query.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statusList.length > 0) {
      sql += ` AND status = ANY($${paramIndex})`;
      params.push(statusList);
      paramIndex++;
    }
  }
  
  // Filtro por cidade
  if (query.cidade) {
    sql += ` AND cidade ILIKE $${paramIndex}`;
    params.push(`%${query.cidade}%`);
    paramIndex++;
  }
  
  // Filtro por bairro
  if (query.bairro) {
    sql += ` AND bairro ILIKE $${paramIndex}`;
    params.push(`%${query.bairro}%`);
    paramIndex++;
  }
  
  // Ordenação
  sql += ' ORDER BY last_renovacao_at DESC NULLS LAST';
  
  // Paginação
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(size, offset);
  
  const result = await db.query(sql, params);
  
  return result.rows;
}
