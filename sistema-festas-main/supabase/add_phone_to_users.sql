-- Adicionar coluna phone na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
