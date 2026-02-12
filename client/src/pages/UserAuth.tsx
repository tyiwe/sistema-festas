import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
    } catch (err: any) {
      setError(err?.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    } catch (err: any) {
      setError(err?.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="brand">Festas</div>
            <p>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</p>
          </div>

          {error && (
            <div className="login-error">
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
                <span>Senha</span>
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

              <div style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
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
                    color: '#0071e3',
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
                <small style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', display: 'block' }}>
                  Deixe em branco se você é um convidado regular
                </small>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn primary large full-width"
              >
                {loading ? "Cadastrando..." : "Cadastrar"}
              </button>

              <div style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
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
                    color: '#0071e3',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: 'inherit',
                  }}
                >
                  Faça login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
