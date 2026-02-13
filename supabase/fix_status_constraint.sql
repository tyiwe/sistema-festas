-- Script para permitir o status 'finished' nos eventos
-- Execute este comando no SQL Editor do seu Supabase Dashboard

-- 1. Remover a restrição antiga
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- 2. Adicionar a nova restrição incluindo 'finished'
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'finished'));

-- Opcional: Se você quiser garantir que o valor padrão continue sendo 'draft'
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';
