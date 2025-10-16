-- Migration: Welcome flows por instância
-- Cada instância pode ter 1 fluxo de boas-vindas configurado

CREATE TABLE IF NOT EXISTS wpp.welcome_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES wpp.instances(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  audio_url TEXT NOT NULL,
  list_config JSONB NOT NULL, -- { title, text, buttonText, sections }
  actions JSONB NOT NULL, -- { "OP_ID": { type, ...params } }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id)
);

CREATE INDEX IF NOT EXISTS idx_welcome_flows_instance ON wpp.welcome_flows(instance_id);

-- Tabela para controlar quem já recebeu boas-vindas (evitar duplicação)
CREATE TABLE IF NOT EXISTS wpp.contacts_welcomed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES wpp.instances(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  welcomed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_welcomed_lookup ON wpp.contacts_welcomed(instance_id, phone);
