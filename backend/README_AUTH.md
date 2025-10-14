# Sistema de Autenticação

## Endpoints

### POST /auth/login
Autentica usuário existente ou cria novo (auto-registro).

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "senha": "senha123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401:**
```json
{
  "error": "Credenciais inválidas",
  "message": "Email ou senha incorretos"
}
```

---

### POST /auth/register
Cria nova conta de usuário e gera webhook token automaticamente.

**Body:**
```json
{
  "email": "novo@exemplo.com",
  "senha": "senha123",
  "nome": "Nome do Usuário" // opcional
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "webhookToken": "abc123xyz...",
  "webhookUrl": "http://api.example.com/webhooks/olx/lead/abc123xyz..."
}
```

**Response 400:**
```json
{
  "error": "Usuário já existe",
  "message": "Este email já está cadastrado"
}
```

---

### POST /auth/forgot
Solicita recuperação de senha.

**Body:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Response 200:**
```json
{
  "ok": true,
  "resetUrl": "http://app.example.com/reset-password?token=xyz..." // DEV only
}
```

> **Nota:** Em produção, o `resetUrl` seria enviado por email. Em desenvolvimento, é retornado no JSON.

---

### POST /auth/reset
Redefine a senha usando token de recuperação.

**Body:**
```json
{
  "token": "xyz...",
  "novaSenha": "novaSenha123"
}
```

**Response 200:**
```json
{
  "ok": true
}
```

**Response 400:**
```json
{
  "error": "Token inválido",
  "message": "Token de recuperação inválido ou expirado"
}
```

---

### GET /auth/me
Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@exemplo.com",
  "nome": "Nome do Usuário"
}
```

**Response 401:**
```json
{
  "error": "Token não fornecido",
  "message": "Autenticação necessária"
}
```

---

## Fluxo de Cadastro

1. Usuário acessa `/register`
2. Preenche email, senha e nome (opcional)
3. Backend:
   - Cria usuário com senha hash (bcrypt)
   - Gera token JWT
   - Gera webhook token único
   - Salva config em `olx.leads_configs`
4. Frontend recebe `token`, `webhookToken` e `webhookUrl`
5. Redireciona para `/onboarding` mostrando o webhook

---

## Fluxo de Recuperação de Senha

1. Usuário acessa `/forgot-password`
2. Informa email
3. Backend:
   - Gera token de reset com validade de 1 hora
   - Salva em `olx.password_resets`
   - Retorna URL (DEV) ou envia email (PROD)
4. Usuário clica no link `/reset-password?token=...`
5. Informa nova senha
6. Backend:
   - Valida token (não expirado, não usado)
   - Atualiza senha com hash
   - Marca token como usado
7. Redireciona para `/login`

---

## Segurança

- ✅ Senhas sempre com bcrypt hash
- ✅ Tokens de reset expiram em 1 hora
- ✅ Tokens de reset são de uso único
- ✅ JWT com expiração configurável (padrão 7 dias)
- ✅ Mensagens de erro genéricas para não revelar existência de email
- ✅ Rate limiting em todas rotas de auth

---

## Migrations

Execute a migration para criar a tabela de password resets:

```sql
-- backend/migrations/002_password_resets.sql
CREATE TABLE IF NOT EXISTS olx.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES olx.usuarios(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```
