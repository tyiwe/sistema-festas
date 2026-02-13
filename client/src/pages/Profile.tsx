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
        <main className="stack" style={{ gap: '40px' }}>
          
          <div className="grid cols-2" style={{ gap: '24px', alignItems: 'start' }}>
            <section className="card" style={{ padding: '32px', border: 'none', background: 'var(--bg-alt)', height: '100%' }}>
              <div className="stack" style={{ gap: '24px' }}>
                <div className="row" style={{ gap: '20px' }}>
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '40px', 
                    background: 'linear-gradient(135deg, #0071e3 0%, #409eff 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', color: 'white', fontWeight: 800
                  }}>
                    {user?.full_name?.charAt(0)}
                  </div>
                  <div className="stack tight">
                    <h1 style={{ fontSize: '24px', margin: 0 }}>{user?.full_name}</h1>
                    <p className="muted" style={{ margin: 0 }}>{user?.email}</p>
                    <div style={{ marginTop: '8px' }}>
                      <span className="status-badge published">Membro</span>
                    </div>
                  </div>
                </div>

                <div className="stack tight">
                  <p className="small muted">
                    Bem-vindo à sua central de perfil. Aqui você pode gerenciar seus dados pessoais e senhas.
                  </p>
                </div>
              </div>
            </section>

            <section className="form-card" style={{ maxWidth: '100%', margin: 0, padding: '32px' }}>
              <h3 style={{ marginBottom: '24px' }}>Editar Informações</h3>
              
              {error && <div className="status-badge drafted" style={{ width: '100%', marginBottom: '16px', color: 'var(--error)', background: 'var(--error-bg)', padding: '12px' }}>{error}</div>}
              {success && <div className="status-badge published" style={{ width: '100%', marginBottom: '16px', padding: '12px' }}>{success}</div>}

              <form onSubmit={handleUpdateProfile} className="stack tight">
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                <p className="small muted" style={{ marginBottom: '12px' }}>Deixe em branco para manter a senha atual</p>
                
                <div className="grid cols-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label>Nova Senha</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Senha</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn primary-glow" disabled={updating} style={{ marginTop: '16px' }}>
                  {updating ? "Salvando..." : "Salvar Alterações"}
                </button>
              </form>
            </section>
          </div>

          <div className="row center" style={{ gap: '16px' }}>
            <Link to="/my-registrations" className="btn ghost">Ver Histórico de Inscrições</Link>
            <Link to="/" className="btn secondary">Voltar para Início</Link>
          </div>
        </main>
      </div>
    </>
  );
}
