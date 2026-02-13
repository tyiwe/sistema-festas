import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import Header from "../components/Header";

export default function UserAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se já está logado
  useEffect(() => {
    apiGet<{ authenticated: boolean }>("/user/me")
      .then((r) => {
        if (r.authenticated) {
          navigate("/my-registrations");
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerEmailConfirm, setRegisterEmailConfirm] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerAdminCode, setRegisterAdminCode] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPost("/user/login", {
        email: loginEmail,
        password: loginPassword,
      });
      navigate("/my-registrations");
      window.location.reload(); // Garante que o Header atualize o estado de admin
    } catch (err: any) {
      // Mensagem amigável para erro de login
      if (err?.message?.includes("Invalid login credentials") || err?.message?.includes("401")) {
        setError("E-mail ou senha incorretos. Por favor, tente novamente.");
      } else {
        setError(err?.message || "Erro ao fazer login. Verifique sua conexão.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validações de Frontend amigáveis
    if (registerFullName.trim().length < 3) {
      setError("Por favor, insira seu nome completo.");
      return;
    }

    if (registerEmail !== registerEmailConfirm) {
      setError("Os e-mails digitados não coincidem.");
      return;
    }

    if (registerPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/user/register", {
        email: registerEmail,
        email_confirm: registerEmailConfirm,
        password: registerPassword,
        full_name: registerFullName,
        admin_code: registerAdminCode,
      });
      navigate("/my-registrations");
      window.location.reload(); // Garante que o Header atualize o estado de admin
    } catch (err: any) {
      if (err?.message?.includes("already registered")) {
        setError("Este e-mail já está cadastrado.");
      } else if (err?.message?.includes("Invalid admin code")) {
        setError("O código de administrador é inválido.");
      } else {
        setError(err?.message || "Erro ao realizar cadastro.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: '100px' }}>
        <div className="form-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
          <div className="stack tight" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 className="hero-title" style={{ fontSize: '32px', margin: 0 }}>
              {mode === "login" ? "Bem-vindo de" : "Crie sua"} <span className="gradient-text">{mode === "login" ? "Volta" : "Conta"}</span>
            </h1>
            <p className="muted" style={{ fontSize: '16px' }}>
              {mode === "login" ? "Entre para gerenciar suas inscrições." : "Cadastre-se para participar dos eventos."}
            </p>
          </div>

          {error && (
            <div className="login-error" style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--error-bg)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Senha</span>
                  <a 
                    href={`https://wa.me/5511991336096?text=${encodeURIComponent(`Olá! Esqueci minha senha do Sistema de Festas e gostaria de recuperá-la. Meu e-mail é: ${loginEmail || "[seu e-mail]"}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn primary large full-width"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: 'inherit',
                  }}
                >
                  Cadastre-se
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field">
                <span>Nome Completo</span>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Confirmar E-mail</span>
                <input
                  type="email"
                  placeholder="Confirme seu e-mail"
                  value={registerEmailConfirm}
                  onChange={(e) => setRegisterEmailConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Senha (mínimo 6 caracteres)</span>
                <input
                  type="password"
                  placeholder="Escolha uma senha"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Código de Acesso (opcional)</span>
                <input
                  type="password"
                  placeholder="Se você é administrador, insira o código"
                  value={registerAdminCode}
                  onChange={(e) => setRegisterAdminCode(e.target.value)}
                />
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Deixe em branco se você é um convidado regular
                </small>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn primary large full-width"
              >
                {loading ? "Criando conta..." : "Criar Conta"}
              </button>

              <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: 'inherit',
                  }}
                >
                  Entrar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
