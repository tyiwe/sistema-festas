#!/bin/bash
set -e

echo "📦 Instalando dependências..."
npm install

echo "🔨 Compilando TypeScript..."
npm run build

echo "✅ Build concluído com sucesso!"
