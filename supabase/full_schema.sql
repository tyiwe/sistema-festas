-- Sistema de Festas (Supabase) - Schema Completo
-- Execute este script no Supabase SQL Editor para criar todas as tabelas do zero.

-- Remover tabelas existentes para garantir um ambiente limpo (opcional, use com cautela em produção)
DROP TABLE IF EXISTS registration_selections CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS event_options CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  cover_image_url TEXT,
  -- Galeria (URLs públicas). Pode deixar vazio.
  gallery_image_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished')),
  registration_deadline TIMESTAMPTZ,
  capacity INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Opções por evento (bebidas/comidas/...)
-- Por enquanto vamos usar type = 'drink'
CREATE TABLE IF NOT EXISTS event_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('drink', 'food')),
  name TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inscrições
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Adicionado user_id
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seleções (ligação N:N: inscrição escolhe várias opções)
CREATE TABLE IF NOT EXISTS registration_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES event_options(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES úteis
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_event_options_event_id ON event_options(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_event ON registrations(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_registration_selections_registration_id ON registration_selections(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_selections_option_id ON registration_selections(option_id);

-- Ajuste para projetos que já existiam sem gallery_image_urls
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_image_urls TEXT[] DEFAULT '{}';
