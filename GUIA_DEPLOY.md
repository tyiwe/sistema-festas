# Guia de Deploy: Sistema de Festas no Netlify e Render

**Autor:** Manus AI
**Data:** 11 de Fevereiro de 2026

## 1. Introdução

Este documento fornece um guia passo a passo para realizar o deploy da sua aplicação "Sistema de Festas". O frontend (cliente) será hospedado na **Netlify**, uma plataforma otimizada para sites estáticos e aplicações Jamstack, enquanto o backend (servidor) será hospedado no **Render.com**, uma plataforma de nuvem unificada para construir e executar aplicações e sites.

Para facilitar o processo, foram criados e modificados alguns arquivos de configuração no seu projeto. Eles automatizam grande parte do processo de build e configuração em ambas as plataformas.

## 2. Estrutura do Projeto

O projeto está organizado em um monorepo com duas pastas principais:

- `/client`: Contém a aplicação frontend desenvolvida com React (Vite) e TypeScript.
- `/server`: Contém a API backend desenvolvida com Express.js e TypeScript.

## 3. Deploy do Backend (Render.com)

O backend será implantado como um "Blueprint" no Render, utilizando o arquivo `render.yaml` que adicionei à raiz do seu projeto. Este arquivo define o serviço, o ambiente, os comandos de build e as variáveis de ambiente necessárias.

### Passo a Passo

1.  **Crie uma conta no Render.com** e faça o login.
2.  No painel, clique em **"New +"** e selecione **"Blueprint"**.
3.  **Conecte seu repositório do GitHub/GitLab** onde o projeto está hospedado.
4.  O Render irá detectar automaticamente o arquivo `render.yaml` na raiz do seu repositório. Ele preencherá as configurações do serviço chamado `sistema-festas-backend`.
5.  Clique em **"Apply"** para confirmar a criação do serviço.
6.  **Configure as Variáveis de Ambiente Secretas:** O Render não pode adivinhar seus segredos. Você precisa configurá-los manualmente. Vá para a aba **"Environment"** do seu novo serviço e adicione as seguintes variáveis:

| Chave (Key)                  | Valor (Value)                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                  | Uma string longa e segura para assinar os tokens. O Render pode gerar uma para você.                      |
| `ADMIN_CODE`                  | O código secreto para criar contas de administrador.                                                      |
| `SUPABASE_URL`                | A URL do seu projeto Supabase. Encontre em *Project Settings > API > Project URL*.                        |
| `SUPABASE_SERVICE_ROLE_KEY`   | A chave de serviço do seu projeto Supabase. Encontre em *Project Settings > API > Project API Keys*.      |
| `CLIENT_URL`                  | **Deixe em branco por enquanto.** Você preencherá esta variável com a URL do seu site Netlify no final. |

7.  Após configurar as variáveis, o Render iniciará o primeiro deploy automaticamente. Você pode acompanhar o progresso na aba **"Events"**.
8.  Após o deploy ser concluído com sucesso, anote a URL do seu backend (algo como `https://sistema-festas-backend.onrender.com`). Você precisará dela para o próximo passo.

## 4. Deploy do Frontend (Netlify)

O frontend será implantado na Netlify. O arquivo `netlify.toml` que adicionei na pasta `/client` contém as instruções de build e redirecionamento necessárias para uma Single-Page Application (SPA).

### Passo a Passo

1.  **Crie uma conta na Netlify** e faça o login.
2.  No painel, clique em **"Add new site"** e selecione **"Import an existing project"**.
3.  **Conecte seu repositório do GitHub/GitLab**.
4.  **Configure as Configurações de Build:** A Netlify tentará adivinhar as configurações, mas é crucial verificá-las. Use os seguintes valores:

| Configuração         | Valor                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| **Base directory**   | `client` (Informa à Netlify para rodar os comandos a partir desta pasta)                                   |
| **Build command**    | `npm run build` ou `vite build`                                                                           |
| **Publish directory**| `client/dist` (O Vite gera os arquivos de produção nesta pasta)                                            |

5.  **Adicione a Variável de Ambiente:** Antes de iniciar o deploy, vá para **"Site settings" > "Build & deploy" > "Environment"** e adicione a seguinte variável:

| Chave (Key)       | Valor (Value)                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE`   | A URL completa do seu backend no Render que você anotou no passo anterior (ex: `https://sistema-festas-backend.onrender.com`). |

6.  Clique em **"Deploy site"**. A Netlify irá buscar o código, instalar as dependências, executar o build e implantar sua aplicação.
7.  Após o deploy, a Netlify fornecerá uma URL para o seu site (ex: `https://seu-nome-de-site.netlify.app`).

## 5. Passo Final: Conectar Frontend e Backend

Agora que ambos os serviços estão no ar, o último passo é informar ao backend a URL do frontend para permitir a comunicação (CORS).

1.  Copie a URL do seu site na Netlify.
2.  Volte ao painel do seu serviço no **Render.com**.
3.  Vá para a aba **"Environment"**.
4.  Encontre a variável `CLIENT_URL` que você deixou em branco e cole a URL da Netlify no campo de valor.
5.  Salve a variável. O Render irá automaticamente reiniciar seu serviço com a nova configuração.

**Pronto!** Sua aplicação deve estar totalmente funcional, com o frontend na Netlify se comunicando com o backend no Render.com.
