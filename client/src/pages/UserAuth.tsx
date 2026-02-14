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
      // Pequeno delay para garantir que o cookie seja processado em dispositivos móveis
      setTimeout(() => {
        window.location.href = "/my-registrations";
      }, 500);
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
      // Pequeno delay para garantir que o cookie seja processado em dispositivos móveis
      setTimeout(() => {
        window.location.href = "/my-registrations";
      }, 500);
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

      <div className="login-wrapper fade-in">
        <div className="login-card stagger-1">
          <div className="login-header stagger-2">
            <h1 className="brand">Festas</h1>
            <p>{mode === "login" ? "Acesse sua conta para continuar" : "Crie sua conta para participar dos eventos"}</p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  placeholder="exemplo@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Senha</span>
                <input
                  type="password"
                  placeholder="Sua senha de acesso"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn primary large full-width" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="auth-footer">
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="link-btn"
                >
                  Cadastre-se agora
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="field">
                <span>Nome Completo</span>
                <input
                  type="text"
                  placeholder="Como quer ser chamado"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  placeholder="exemplo@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Confirme seu E-mail</span>
                <input
                  type="email"
                  placeholder="Repita o e-mail"
                  value={registerEmailConfirm}
                  onChange={(e) => setRegisterEmailConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Senha</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Código de Organizador (Opcional)</span>
                <input
                  type="password"
                  placeholder="Caso você organize eventos"
                  value={registerAdminCode}
                  onChange={(e) => setRegisterAdminCode(e.target.value)}
                />
              </div>

              <button type="submit" className="btn primary large full-width" disabled={loading}>
                {loading ? "Criando conta..." : "Criar Conta"}
              </button>

              <div className="auth-footer">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="link-btn"
                >
                  Fazer login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
