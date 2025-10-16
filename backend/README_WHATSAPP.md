# WhatsApp Integration - Documentação Completa

## 📋 Visão Geral

Sistema completo de integração WhatsApp via Evolution API, permitindo criar instâncias, conectar números e enviar mensagens automatizadas (texto, áudio, mídia, localização, listas/menus e contatos).

## 🏗️ Arquitetura

### Backend (Express + Evolution API)

#### Arquivos Criados/Modificados

1. **`backend/src/services/evolution.mjs`**
   - Service centralizado para comunicação com Evolution API
   - Funções implementadas:
     - `evoCreateInstance()` - Criar instância WhatsApp
     - `evoGetInstance()` - Buscar status/QR code
     - `evoSendText()` - Enviar mensagem de texto
     - `evoSendAudio()` - Enviar áudio
     - `evoSendMedia()` - Enviar imagem/vídeo/documento
     - `evoSendLocation()` - Enviar localização
     - `evoSendList()` - Enviar lista/menu interativo
     - `evoSendContact()` - Enviar contato (vCard)

2. **`backend/src/routes/wpp.mjs`**
   - POST `/api/wpp/instances` - Criar instância
   - Validação com Zod
   - Persistência em PostgreSQL (`wpp.instances`)
   - Geração automática de token Evolution

3. **`backend/src/routes/wpp-messages.mjs`** (NOVO)
   - POST `/api/wpp/:instanceName/messages/text`
   - POST `/api/wpp/:instanceName/messages/audio`
   - POST `/api/wpp/:instanceName/messages/media`
   - POST `/api/wpp/:instanceName/messages/location`
   - POST `/api/wpp/:instanceName/messages/list`
   - POST `/api/wpp/:instanceName/messages/contact`

4. **`backend/src/routes/contacts.mjs`** (NOVO)
   - POST `/api/contacts` - Salvar contato no banco local

5. **`backend/src/server.mjs`**
   - Registrou rotas `wppMessagesRoutes` e `contactsRoutes`

### Frontend (React + TypeScript + shadcn/ui)

#### Arquivo Criado

**`src/pages/WhatsApp.tsx`**
- Interface completa de administração WhatsApp
- 3 seções principais:
  1. **Criar Instância** - Formulário de criação + exibição de QR code
  2. **Enviar Mensagens** - Tabs para cada tipo de mensagem
  3. **Salvar Contatos** - Persistência local

## 🔧 Configuração

### Variáveis de Ambiente (Backend)

Adicione ao `backend/.env`:

```bash
# Evolution API
EVO_BASE_URL=http://80.190.82.217:18080
EVO_API_KEY=sua_apikey_aqui

# Webhook (opcional)
BACKEND_PUBLIC_URL=http://80.190.82.217:4000
```

### Variáveis de Ambiente (Frontend)

Confirme em `.env`:

```bash
VITE_API_BASE_URL=http://80.190.82.217:4000
```

## 📊 Estrutura de Dados

### Tabela: `wpp.instances`

```sql
CREATE TABLE wpp.instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES olx.usuarios(id),
  instance_name TEXT UNIQUE NOT NULL,
  token TEXT NOT NULL,
  number TEXT,
  webhook TEXT,
  integration TEXT DEFAULT 'WHATSAPP-BAILEYS',
  always_online BOOLEAN DEFAULT true,
  read_messages BOOLEAN DEFAULT true,
  read_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Limite de 2 instâncias por usuário (via trigger/constraint)
```

### Tabela: `wpp.contacts`

```sql
CREATE TABLE wpp.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES olx.usuarios(id),
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, phone)
);
```

## 🚀 Como Usar

### 1. Criar Instância WhatsApp

**Frontend:** `/whatsapp`

1. Preencha:
   - **Nome da instância**: `inst_meuusuario_001` (alfanumérico + `_.-`)
   - **Número**: `5527997222542` (formato E.164)
   - **Webhook** (opcional): `https://seu-dominio.com/webhooks/evolution`

2. Clique em **Criar Instância**

3. **QR Code** aparecerá automaticamente
   - Abra WhatsApp no celular
   - Vá em **Dispositivos Conectados** > **Conectar Dispositivo**
   - Escaneie o QR code

**Backend:** POST `/api/wpp/instances`

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/instances \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "inst_teste_001",
    "number": "5527997222542",
    "webhook": "https://seu-dominio.com/webhooks/evolution"
  }'
```

**Resposta:**
```json
{
  "ok": true,
  "instance": {
    "user_id": "uuid",
    "instance_name": "inst_teste_001",
    "webhook": "https://..."
  },
  "evolution": {
    "instance": { ... },
    "qrcode": {
      "base64": "data:image/png;base64,..."
    }
  }
}
```

### 2. Enviar Mensagens

#### 2.1 Texto

**Frontend:** Tab "Texto"

**Backend:**
```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/text \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "text": "Olá! Esta é uma mensagem de teste."
  }'
```

#### 2.2 Áudio

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/audio \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "audioUrl": "https://exemplo.com/audio.mp3"
  }'
```

#### 2.3 Mídia (Imagem/Vídeo/Documento)

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/media \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "mediaUrl": "https://exemplo.com/imagem.jpg",
    "caption": "Legenda opcional"
  }'
```

#### 2.4 Localização

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/location \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "latitude": -20.2976178,
    "longitude": -40.2957768,
    "name": "Minha Loja",
    "address": "Rua Exemplo, 123 - Centro"
  }'
```

#### 2.5 Lista/Menu Interativo

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/list \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "title": "Opções",
    "text": "Escolha uma opção:",
    "buttonText": "Ver opções",
    "sections": [
      {
        "title": "Atendimento",
        "rows": [
          {
            "id": "OP1",
            "title": "Falar com humano",
            "description": "Encaminhar ao atendente"
          },
          {
            "id": "OP2",
            "title": "Status do pedido",
            "description": "Consultar automaticamente"
          }
        ]
      }
    ]
  }'
```

#### 2.6 Contato (vCard)

```bash
curl -X POST http://80.190.82.217:4000/api/wpp/inst_teste_001/messages/contact \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5527997222542",
    "contact": {
      "fullName": "Fulano da Silva",
      "org": "Minha Empresa",
      "phones": [
        {
          "number": "5527997000000",
          "type": "WORK"
        }
      ]
    }
  }'
```

### 3. Salvar Contato Local

```bash
curl -X POST http://80.190.82.217:4000/api/contacts \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5527997222542",
    "name": "João Silva"
  }'
```

## 🔐 Segurança

### Frontend
- ❌ **NUNCA** expor `EVO_API_KEY` no frontend
- ✅ Sempre usar `VITE_API_BASE_URL` para chamar backend
- ✅ JWT obrigatório em todas as requisições protegidas
- ✅ Validação de webhook como HTTPS

### Backend
- ✅ `authMiddleware` valida JWT em todas as rotas protegidas
- ✅ Validação Zod em todos os payloads
- ✅ Rate limiting global e por rota
- ✅ `EVO_API_KEY` guardado apenas no servidor
- ✅ Filtro por `user_id` em todas as consultas

## 🐛 Troubleshooting

### Erro: "Invalid 'url' property"
**Causa:** Evolution API requer `webhookUrl` (ou `url`), não `webhook`  
**Solução:** Backend já corrigido para usar `webhookUrl`

### Erro: "Limite de 2 instâncias ativas"
**Causa:** Usuário já possui 2 instâncias conectadas  
**Solução:** Desconectar/deletar instância antiga antes de criar nova

### QR Code não aparece
**Verificar:**
1. Evolution API está rodando (`http://80.190.82.217:18080/health`)
2. `EVO_API_KEY` está correta
3. Resposta do backend contém `evolution.qrcode.base64`

### Mensagem não enviada
**Verificar:**
1. Instância está conectada (status `open`)
2. Número destinatário está no formato E.164 (`55DDD9XXXXXXXX`)
3. Logs do backend para erros da Evolution

## 📚 Referências

### Evolution API Docs
- [Create Instance](https://doc.evolution-api.com/v1/api-reference/instance-controller/create-instance-basic)
- [Send Text](https://doc.evolution-api.com/v1/api-reference/message-controller/send-text)
- [Send Audio](https://doc.evolution-api.com/v1/api-reference/message-controller/send-audio)
- [Send Media](https://doc.evolution-api.com/v1/api-reference/message-controller/send-media)
- [Send List](https://doc.evolution-api.com/v1/api-reference/message-controller/send-list)
- [Send Contact](https://doc.evolution-api.com/v1/api-reference/message-controller/send-contact)
- [Send Location](https://doc.evolution-api.com/v1/api-reference/message-controller/send-location)

### Schemas Zod

Ver `backend/src/routes/wpp-messages.mjs` para validações completas de cada tipo de mensagem.

## 🎯 Próximos Passos Sugeridos

1. **Automação de Boas-Vindas**
   - Criar endpoint POST `/api/wpp/welcome-config` para salvar templates
   - Webhook Evolution recebe novo contato → dispara mensagem automática

2. **Dashboard de Status**
   - GET `/api/wpp/instances` - Listar instâncias do usuário
   - GET `/api/wpp/:instanceName/status` - Status de conexão

3. **Histórico de Mensagens**
   - Persistir mensagens enviadas em `wpp.messages_log`
   - Relatórios de envio/entrega

4. **Templates Reutilizáveis**
   - CRUD de templates (texto, listas etc.)
   - Variáveis dinâmicas (`{{nome}}`, `{{produto}}`)

5. **Integração OLX**
   - Quando novo lead OLX chegar → enviar WhatsApp automático
   - Usar dados do anúncio para personalizar mensagem

## ✅ Checklist de Testes

- [ ] Criar instância com sucesso
- [ ] QR code é exibido
- [ ] Escanear QR conecta WhatsApp
- [ ] Enviar texto
- [ ] Enviar áudio (URL)
- [ ] Enviar mídia (imagem/vídeo)
- [ ] Enviar localização
- [ ] Enviar lista interativa
- [ ] Enviar contato (vCard)
- [ ] Salvar contato no banco
- [ ] Erro 401 sem JWT
- [ ] Erro 400 com payload inválido
- [ ] Limite de 2 instâncias respeitado

---

**Versão:** 1.0  
**Data:** 2025-10-16  
**Desenvolvido para:** Responder OLX
