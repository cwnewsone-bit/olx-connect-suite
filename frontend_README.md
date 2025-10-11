# Responder OLX - Frontend

Frontend React da aplicação Responder OLX, construído com Vite, TypeScript, TailwindCSS e shadcn/ui.

## Características

- ✅ **React 18** + **Vite** para desenvolvimento rápido
- ✅ **TypeScript** para type safety
- ✅ **TailwindCSS** + **shadcn/ui** para UI moderna
- ✅ **React Router** para navegação
- ✅ **Zod** para validação de schemas
- ✅ **JWT Authentication** com guards de rotas
- ✅ **Design system** completo com semantic tokens
- ✅ **Responsive** e mobile-first
- ✅ **SEO optimized**

## Setup Rápido

```bash
npm install
cp .env.example .env
# Editar .env com a URL do backend
npm run dev
```

## Variáveis de Ambiente

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_USE_MOCK=0
```

## Estrutura

```
/src
  /components
    /layout      - Layout principal (sidebar, header)
    /ui          - Componentes shadcn customizados
  /pages         - Páginas da aplicação
  /lib
    api.ts       - Cliente HTTP com interceptadores
    auth.ts      - Funções de autenticação
    schemas.ts   - Schemas Zod de validação
    guards.tsx   - Guards de autenticação
    i18n.ts      - Strings PT-BR
  index.css      - Design system (tokens CSS)
  router.tsx     - Configuração de rotas
```

## Páginas

- `/login` - Autenticação
- `/dashboard` - Overview e métricas
- `/anuncios` - Lista e gerenciamento de anúncios
- `/contatos` - Contatos/leads recebidos
- `/automacao` - Configurações de automação
- `/olx/conectado` - Callback OAuth OLX
- `/settings` - Configurações (placeholder)
- `/profile` - Perfil do usuário

## Design System

Todos os estilos usam **semantic tokens** definidos em `index.css`:
- Cores: primary, accent, success, warning, destructive, etc.
- Gradientes: gradient-primary, gradient-success
- Sombras: shadow-sm, shadow-md, shadow-lg, shadow-primary

**Nunca use classes diretas** como `text-white`, `bg-blue-500`, etc. Use os tokens semânticos!

## Componentes Customizados

### Badge
Variantes: `default`, `secondary`, `destructive`, `success`, `warning`, `info`, `outline`

### StatusBadge
Badge automático baseado em status de anúncio (Ativo, Pausado, Vendido, Rascunho)

## API Client

O cliente em `lib/api.ts`:
- Injeta automaticamente token JWT
- Trata erro 401 (redireciona para login)
- Valida responses com Zod
- Suporta modo mock (VITE_USE_MOCK=1)

## Autenticação

1. Login em `/login` → salva token no localStorage
2. Guards verificam token antes de cada rota protegida
3. Erro 401 limpa token e redireciona para login
4. Header exibe status da conexão OLX e menu do usuário

## OAuth OLX

1. Botão "Conectar OLX" chama `GET /oauth/olx/start-url`
2. Redireciona para página de autorização da OLX
3. Callback retorna para `/olx/conectado?email=...`
4. Página exibe sucesso e redireciona para dashboard

## Desenvolvimento

```bash
npm run dev      # Dev server
npm run build    # Build para produção
npm run preview  # Preview da build
```

## Boas Práticas

- ✅ Sempre validar responses com Zod
- ✅ Usar semantic tokens do design system
- ✅ Componentes pequenos e reutilizáveis
- ✅ Error boundaries e states (loading, empty, error)
- ✅ Toasts para feedback ao usuário
- ✅ Mobile-first e responsive
- ❌ NUNCA expor tokens OLX no frontend
- ❌ NUNCA usar cores diretas (sempre usar tokens)

## Deploy

Build de produção gera arquivos estáticos em `/dist`:
```bash
npm run build
```

Sirva com qualquer servidor HTTP estático (Nginx, Vercel, Netlify, etc.).
