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
      <Header />
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="row between" style={{ alignItems: 'flex-end', marginBottom: '20px' }}>
            <div className="stack tight" style={{ gap: '8px' }}>
              <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', textAlign: 'left', margin: 0 }}>
                Seus <span className="gradient-text">Eventos</span>
              </h1>
              <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
                Gerencie suas festas e inscrições de forma simples.
              </p>
            </div>
            <Link to="/admin/new" className="btn primary-glow" style={{ padding: '12px 24px', borderRadius: 'var(--radius-sm)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Evento
            </Link>
          </section>

          {error && (
            <div style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--error-bg)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              fontSize: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <section className="stack tight">
            {sorted.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 24px' }}>
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="10" width="32" height="28" rx="4" stroke="var(--text-muted)" strokeWidth="2" fill="none"/>
                    <path d="M8 18H40" stroke="var(--text-muted)" strokeWidth="2"/>
                    <path d="M16 6V14M32 6V14" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Nenhum evento criado ainda</h3>
                <p>Crie seu primeiro evento para começar.</p>
                <Link to="/admin/new" className="btn primary" style={{ marginTop: '20px' }}>Criar Primeiro Evento</Link>
              </div>
            ) : (
              sorted.map((e) => (
                <div key={e.id} className="admin-event-row">
                  <div className="row between">
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '12px', 
                        background: 'var(--bg-alt)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        border: '1px solid var(--border)'
                      }}>
                        🎉
                      </div>
                      <div>
                        <div className="row" style={{ gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{e.title}</h3>
                          <button 
                            onClick={() => toggleStatus(e)}
                            className={`status-badge ${e.status}`}
                            style={{ cursor: 'pointer', border: 'none', transition: 'all 0.2s ease' }}
                            title="Clique para alternar status (Rascunho <-> Publicado)"
                          >
                            {e.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </button>
                        </div>
                        <div className="row muted small" style={{ gap: '12px' }}>
                          <span className="row" style={{ gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {e.location}
                          </span>
                          <span className="row" style={{ gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {new Date(e.date_time).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row" style={{ gap: '12px' }}>
                      <Link to={`/admin/events/${e.id}/stats`} className="btn" style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        Estatísticas
                      </Link>
                      <Link to={`/admin/edit/${e.id}`} className="btn" style={{ background: 'var(--bg-alt)', color: 'var(--text)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <hr style={{ margin: '60px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

          <section className="stack">
            <div className="stack tight" style={{ gap: '8px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', margin: 0 }}>Gerenciar <span className="gradient-text">Usuários</span></h2>
              <p className="muted">Visualize todos os cadastrados e resete senhas se necessário.</p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>
              {/* Lista de Usuários */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-alt)', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    <tr>
                      <th style={{ padding: '16px' }}>Nome / E-mail</th>
                      <th style={{ padding: '16px' }}>Criado em</th>
                      <th style={{ padding: '16px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '14px' }}>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhum usuário encontrado na base de dados.
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px' }}>
                            <div className="stack tight">
                              <span style={{ fontWeight: 600 }}>{u.full_name || 'Sem nome'}</span>
                              <span className="muted" style={{ fontSize: '12px' }}>{u.email}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }} className="muted">
                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <button 
                              className="btn ghost small" 
                              onClick={() => {
                                setSelectedUserEmail(u.email);
                                setResetPassword("");
                                setResetSuccess(null);
                              }}
                              style={{ color: 'var(--primary)', padding: '4px 8px' }}
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

              {/* Formulário de Reset */}
              <div className="card stack" style={{ padding: '24px', gap: '16px', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Resetar Senha</h3>
                
                {resetSuccess && (
                  <div className="status-badge published" style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                    {resetSuccess}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="stack" style={{ gap: '16px' }}>
                  <div className="field">
                    <span>E-mail do Convidado</span>
                    <input 
                      type="email" 
                      value={selectedUserEmail} 
                      onChange={(e) => setSelectedUserEmail(e.target.value)} 
                      placeholder="Selecione na lista ou digite"
                      required 
                    />
                  </div>
                  <div className="field">
                    <span>Nova Senha Temporária</span>
                    <input 
                      type="text" 
                      value={resetPassword} 
                      onChange={(e) => setResetPassword(e.target.value)} 
                      placeholder="ex: festa123"
                      required 
                    />
                  </div>

                  <button type="submit" className="btn primary full-width" disabled={resetLoading || !selectedUserEmail}>
                    {resetLoading ? "Atualizando..." : "Confirmar Novo Acesso"}
                  </button>
                  
                  <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
                    Ao confirmar, a senha antiga deixará de funcionar imediatamente.
                  </p>
                </form>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
