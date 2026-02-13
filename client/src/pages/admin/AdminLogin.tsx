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
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <Link className="brand" to="/" style={{ fontSize: '28px' }}>
            Festas
          </Link>
          <p>Acesse o painel de controle</p>
        </div>

        <div className="stack tight" style={{ padding: 0 }}>
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
            className="btn primary-glow full-width"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={submit}
            disabled={loading || !password}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <Link
            to="/"
            className="muted small"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '16px',
              textDecoration: 'none'
            }}
          >
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
