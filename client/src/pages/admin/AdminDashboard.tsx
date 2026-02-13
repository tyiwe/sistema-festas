import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPut, apiPost } from "../../api";
import Header from "../../components/Header";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  location: string;
  status: "draft" | "published" | "finished";
  created_at: string;
  cover_image_url: string | null;
  gallery_image_urls: string[] | null;
  registration_deadline: string | null;
  capacity: number | null;
};

type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [eventsRes, usersRes] = await Promise.all([
        apiGet<{ events: EventRow[] }>("/admin/events"),
        apiGet<{ users: User[] }>("/admin/users")
      ]);
      setEvents(eventsRes.events);
      setUsers(usersRes.users);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(event: EventRow) {
    console.log("Toggle status clicked for event:", event.id, "current status:", event.status);
    const nextStatus: EventRow["status"] = event.status === "draft" ? "published" : "draft";

    try {
      // Enviando o objeto completo para ser compatível com o backend antigo no Onrender
      const res = await apiPut(`/admin/events/${event.id}`, {
        ...event,
        status: nextStatus
      });
      console.log("API response:", res);
      load();
    } catch (e: any) {
      console.error("Error toggling status:", e);
      setError("Erro ao alterar status: " + (e?.message ?? e));
    }
  }

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [events]);

  // Reset de senha
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetSuccess(null);
    setError(null);
    setResetLoading(true);

    try {
      await apiPost("/admin/users/reset-password", {
        email: selectedUserEmail,
        newPassword: resetPassword
      });
      setResetSuccess(`Senha de ${selectedUserEmail} atualizada com sucesso!`);
      setSelectedUserEmail("");
      setResetPassword("");
    } catch (err: any) {
      setError(err.message || "Erro ao resetar senha");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <>
      <Header title="Painel Admin" />
      <div className="container fade-in" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="row between stagger-1" style={{ alignItems: 'flex-end', marginBottom: '20px' }}>
            <div className="stack tight" style={{ gap: '8px' }}>
              <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', textAlign: 'left', margin: 0 }}>
                Seus <span className="gradient-text">Eventos</span>
              </h1>
              <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
                Gerencie suas festas e inscrições de forma simples.
              </p>
            </div>
            <Link to="/admin/new" className="btn primary large">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Evento
            </Link>
          </section>

          {error && (
            <div className="login-error stagger-2">
              {error}
            </div>
          )}

          <section className="stack tight stagger-3">
            {sorted.length === 0 ? (
              <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '80px 40px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Nenhum evento criado ainda</h3>
                <p className="muted" style={{ fontSize: '16px', marginBottom: '32px' }}>Crie seu primeiro evento para começar a gerenciar suas festas.</p>
                <Link to="/admin/new" className="btn primary large">Criar Primeiro Evento</Link>
              </div>
            ) : (
              <div className="grid">
                {sorted.map((e) => (
                  <div key={e.id} className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <div className="card-content">
                      <div className="row between" style={{ marginBottom: '20px' }}>
                        <div className="row" style={{ gap: '16px' }}>
                          <div style={{ 
                            width: '56px', 
                            height: '56px', 
                            borderRadius: '16px', 
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#ffffff',
                            border: '1px solid var(--glass-border)',
                            boxShadow: '0 8px 16px var(--primary-glow)'
                          }}>
                            {e.title.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="card-title" style={{ marginBottom: '6px', fontSize: '18px', fontWeight: 700 }}>{e.title}</h3>
                            <button 
                              onClick={() => toggleStatus(e)}
                              className={`status-badge ${e.status}`}
                              style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                              title="Clique para alternar status"
                            >
                              {e.status === 'published' ? 'Publicado' : 'Rascunho'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="card-meta" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="row" style={{ gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.5 }}>Local:</span>
                          <span>{e.location}</span>
                        </div>
                        <div className="row" style={{ gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.5 }}>Data:</span>
                          <span>{new Date(e.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                      
                      <div className="row" style={{ gap: '12px' }}>
                        <Link to={`/admin/events/${e.id}/stats`} className="btn" style={{ flex: 1, textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '13px', fontWeight: 600 }}>
                          Estatísticas
                        </Link>
                        <Link to={`/admin/edit/${e.id}`} className="btn" style={{ flex: 1, textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '13px', fontWeight: 600 }}>
                          Editar
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <hr style={{ margin: '80px 0', border: 'none', borderTop: '1px solid var(--glass-border)', opacity: 0.5 }} />

          <section className="stack stagger-4">
            <div className="stack tight" style={{ gap: '8px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Gerenciar <span className="gradient-text">Usuários</span></h2>
              <p className="muted" style={{ fontSize: '16px' }}>Visualize todos os cadastrados e resete senhas se necessário.</p>
            </div>

            <div className="grid-2-1" style={{ gap: '32px' }}>
              {/* Lista de Usuários */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Convidado</th>
                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Criado em</th>
                        <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '14px' }}>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      ) : (
                        users.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s ease' }} className="table-row-hover">
                            <td style={{ padding: '16px 24px' }}>
                              <div className="stack tight" style={{ gap: '4px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>{u.full_name || 'Sem nome'}</span>
                                <span className="muted" style={{ fontSize: '13px' }}>{u.email}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <span className="muted" style={{ fontSize: '13px' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                              <button 
                                className="link-btn" 
                                onClick={() => {
                                  setSelectedUserEmail(u.email);
                                  setResetPassword("");
                                  setResetSuccess(null);
                                }}
                                style={{ fontSize: '13px', fontWeight: 600 }}
                              >
                                Resetar Senha
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulário de Reset */}
              <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '100px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <div className="card-content">
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Alterar Acesso</h3>
                  
                  {resetSuccess && (
                    <div className="status-badge published" style={{ width: '100%', padding: '12px', textAlign: 'center', marginBottom: '24px', borderRadius: '10px' }}>
                      {resetSuccess}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="auth-form">
                    <div className="field">
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>E-mail do Convidado</label>
                      <input 
                        type="email" 
                        value={selectedUserEmail} 
                        onChange={(e) => setSelectedUserEmail(e.target.value)} 
                        placeholder="Selecione na lista ou digite"
                        required 
                      />
                    </div>
                    <div className="field">
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Nova Senha Temporária</label>
                      <input 
                        type="text" 
                        value={resetPassword} 
                        onChange={(e) => setResetPassword(e.target.value)} 
                        placeholder="ex: festa123"
                        required 
                      />
                    </div>

                    <button type="submit" className="btn primary full-width large" style={{ marginTop: '12px' }} disabled={resetLoading || !selectedUserEmail}>
                      {resetLoading ? "Atualizando..." : "Confirmar Novo Acesso"}
                    </button>
                    
                    <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <p className="muted" style={{ fontSize: '12px', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
                        ⚠️ A senha antiga deixará de funcionar imediatamente após a confirmação.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
