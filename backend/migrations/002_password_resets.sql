-- Tabela para tokens de recuperação de senha
CREATE TABLE IF NOT EXISTS olx.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES olx.usuarios(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON olx.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON olx.password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_active ON olx.password_resets(user_id, used_at) WHERE used_at IS NULL;

-- Comentários
COMMENT ON TABLE olx.password_resets IS 'Tokens para recuperação de senha';
COMMENT ON COLUMN olx.password_resets.token IS 'Token único de recuperação';
COMMENT ON COLUMN olx.password_resets.expires_at IS 'Data de expiração do token (1 hora)';
COMMENT ON COLUMN olx.password_resets.used_at IS 'Data em que o token foi utilizado (null = não usado)';
