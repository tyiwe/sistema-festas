import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../api";
import Header from "../components/Header";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados do formulário
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        if (!meRes.authenticated) {
          navigate("/user-auth");
          return;
        }

        const profileRes = await apiGet<{ user: any }>("/user/profile");
        setUser(profileRes.user);
        setFullName(profileRes.user.full_name);
        setPhone(profileRes.user.phone || "");

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setUpdating(true);
    try {
      const updateData: any = { full_name: fullName, phone };
      if (password) updateData.password = password;

      await apiPut("/user/profile", updateData);
      setSuccess("Perfil atualizado com sucesso!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <Header />;

  return (
    <>
      <Header />
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
        <main className="stack">
          
          <div className="cols-2">
            <section className="card">
              <div className="card-content stack" style={{ padding: '48px' }}>
                <div className="row" style={{ gap: '24px' }}>
                  <div style={{ 
                    width: '96px', height: '96px', borderRadius: '100px', 
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '40px', color: 'white', fontWeight: 800,
                    boxShadow: '0 8px 32px var(--primary-glow)'
                  }}>
                    {user?.full_name?.charAt(0)}
                  </div>
                  <div className="stack tight">
                    <h1 style={{ fontSize: '28px', margin: 0, letterSpacing: '-0.04em' }}>{user?.full_name}</h1>
                    <p className="muted" style={{ margin: 0 }}>{user?.email}</p>
                    <div style={{ marginTop: '8px' }}>
                      <span className="status-badge published">Membro Ativo</span>
                    </div>
                  </div>
                </div>

                <div className="stack tight" style={{ marginTop: '24px' }}>
                  <p className="small muted" style={{ fontSize: '15px', lineHeight: 1.6 }}>
                    Gerencie suas informações pessoais e configurações de segurança para manter sua conta sempre protegida.
                  </p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-content" style={{ padding: '48px' }}>
                <h3 style={{ marginBottom: '32px', fontSize: '20px' }}>Editar Perfil</h3>
                
                {error && <div className="login-error">{error}</div>}
                {success && <div className="status-badge published" style={{ width: '100%', marginBottom: '24px', padding: '12px' }}>{success}</div>}

                <form onSubmit={handleUpdateProfile} className="auth-form">
                  <div className="field">
                    <span>Nome Completo</span>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="field">
                    <span>WhatsApp</span>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  
                  <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />
                  
                  <div className="cols-2" style={{ gap: '16px' }}>
                    <div className="field">
                      <span>Nova Senha</span>
                      <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        minLength={6}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="field">
                      <span>Confirmar</span>
                      <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn primary-glow large full-width" disabled={updating} style={{ marginTop: '16px' }}>
                    {updating ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </form>
              </div>
            </section>
          </div>

          <div className="row center" style={{ gap: '16px', marginTop: '24px' }}>
            <Link to="/" className="btn secondary">Voltar ao Início</Link>
            <Link to="/admin" className="btn secondary">Ir para o Painel</Link>
          </div>
        </main>
      </div>
    </>
  );
}
