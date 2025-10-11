# Responder OLX - Backend API

Backend Node.js (Express) que conecta-se a um **Postgres EXTERNO** e gerencia autenticação JWT + OAuth OLX.

## Características

- ✅ **Sem DB interna**: conecta-se via `DATABASE_URL` a Postgres externo
- ✅ **JWT Authentication**: login com email/senha
- ✅ **OAuth OLX**: fluxo completo de autorização
- ✅ **Dados seguros**: nunca expõe tokens OLX ao frontend
- ✅ **Paginação e filtros**: em anúncios e contatos
- ✅ **Rate limiting**: proteção contra abuso
- ✅ **Validação Zod**: todos os inputs validados

## Setup Rápido

```bash
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run dev
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

- `DATABASE_URL`: conexão com Postgres externo
- `JWT_SECRET`: chave secreta para JWT (mín. 32 chars)
- `OLX_CLIENT_ID`, `OLX_CLIENT_SECRET`: credenciais OAuth OLX
- `OLX_STATE_SECRET`: chave para assinar state OAuth (mín. 32 chars)

## Endpoints Principais

### Autenticação
- `POST /auth/login` - Login com email/senha → retorna JWT
- `GET /auth/me` - Dados do usuário autenticado

### OAuth OLX
- `GET /oauth/olx/start-url` - Gera URL de autorização
- `GET /rest/oauth2-credential/callback` - Callback da OLX

### Dados
- `GET /api/olx/status` - Status da conexão OLX
- `GET /api/anuncios` - Lista anúncios (com filtros)
- `GET /api/contatos` - Lista contatos/leads

## Arquitetura

```
/src
  /routes     - Endpoints organizados por domínio
  /services   - Lógica de negócio
  /middlewares - Auth, etc.
  db.mjs      - Pool de conexões Postgres
  env.mjs     - Validação de env vars
  server.mjs  - Configuração Express
```

## Banco de Dados

O backend **NÃO cria** tabelas. Ele espera que existam:
- `olx.usuarios` - tabela de usuários
- `olx.oauth_connections` - metadados de conexões OAuth
- `olx.v_anuncios_list` - view com anúncios
- `olx.v_contatos_list` - view com contatos

Todas as queries **sempre filtram por `user_id`**.

## Segurança

- Helmet para headers HTTP seguros
- CORS restrito às origens configuradas
- Rate limiting global e específico (login)
- Validação de inputs com Zod
- JWT com expiração configurável
- State OAuth assinado com HMAC
- Nunca expõe tokens OAuth

## Desenvolvimento

```bash
npm run dev  # Watch mode com --watch
npm start    # Produção
```

## Testes Manuais

Checklist de testes:
- [ ] GET /health → 200
- [ ] POST /auth/login → token
- [ ] GET /auth/me → dados do usuário
- [ ] GET /oauth/olx/start-url → URL com state
- [ ] Fluxo OAuth completo
- [ ] GET /api/anuncios com filtros
- [ ] GET /api/contatos?periodo=30

## Produção

- Use HTTPS com proxy reverso
- Configure `trust proxy = 1`
- Ajuste rate limits conforme necessidade
- Monitore logs de erro
- Considere implementar refresh token da OLX
