import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../../api";

export default function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit() {
    setErr(null);
    setLoading(true);
    try {
      await apiPost("/auth/login", { password });
      onLoggedIn();
      nav("/admin");
    } catch (e: any) {
      setErr("Senha incorreta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper fade-in">
      <div className="login-card stagger-1">
        <div className="login-header stagger-2">
          <Link className="brand" to="/">
            Festas
          </Link>
          <p>Acesse o painel de controle</p>
        </div>

        <div className="auth-form stagger-3">
          {err && <div className="login-error">{err}</div>}

          <div className="field">
            <span>Senha de Acesso</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoFocus
            />
          </div>

          <button
            className="btn primary large full-width"
            onClick={submit}
            disabled={loading || !password}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="auth-footer">
            <Link to="/" className="link-btn">
              Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
