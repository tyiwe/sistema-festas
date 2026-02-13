import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../api";
import Header from "../components/Header";

type Registration = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  allergies: string | null;
  notes: string | null;
  created_at: string;
  events: {
    id: string;
    title: string;
    slug: string;
    date_time: string;
    location: string;
  };
  registration_selections: Array<{
    option_id: string;
    event_options: {
      name: string;
    };
  }>;
};

export default function MyRegistrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Verificar autenticação
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        if (!meRes.authenticated) {
          navigate("/user-auth");
          return;
        }

        // Carregar perfil
        const profileRes = await apiGet<{ user: any }>("/user/profile");
        setUser(profileRes.user);

        // Carregar inscrições
        const regsRes = await apiGet<{ registrations: Registration[] }>("/user/my-registrations");
        setRegistrations(regsRes.registrations);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  async function handleCancel(registrationId: string) {
    if (!window.confirm("Tem certeza que deseja cancelar esta inscrição?")) {
      return;
    }

    setCancelingId(registrationId);
    try {
      await apiDelete(`/user/registrations/${registrationId}`);
      setRegistrations((prev) => prev.filter((r) => r.id !== registrationId));
    } catch (err: any) {
      setError(err?.message || "Erro ao cancelar inscrição");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight" style={{ marginBottom: '40px' }}>
            <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', textAlign: 'left', margin: 0 }}>
              Minhas <span className="gradient-text">Inscrições</span>
            </h1>
            <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
              {user ? `Olá, ${user.full_name.split(' ')[0]}! Veja onde você já confirmou presença.` : "Veja seus eventos confirmados."}
            </p>
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 16px' }} />
              <p className="muted">Carregando inscrições...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>Nenhuma inscrição encontrada</h3>
              <p>Você ainda não se inscreveu em nenhum evento.</p>
              <Link to="/" className="btn primary" style={{ marginTop: '24px' }}>
                Explorar Eventos
              </Link>
            </div>
          ) : (
            <div className="grid">
              {registrations.map((reg) => (
                <div key={reg.id} className="card">
                  <div className="card-content">
                    <div className="row between" style={{ marginBottom: '12px' }}>
                      <div className="status-badge published">Inscrito</div>
                      <span className="muted small">{new Date(reg.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <h3 className="card-title">{reg.events.title}</h3>
                    
                    <div className="card-meta" style={{ marginBottom: '16px' }}>
                      <span>📅 {new Date(reg.events.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                      <span>•</span>
                      <span>📍 {reg.events.location}</span>
                    </div>

                    <div className="stack tight" style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--glass-border)', borderRadius: '16px', fontSize: '14px' }}>
                      <div className="row between">
                        <span className="muted">Nome</span>
                        <span>{reg.full_name}</span>
                      </div>
                      <div className="row between">
                        <span className="muted">WhatsApp</span>
                        <span>{reg.phone}</span>
                      </div>
                      {reg.registration_selections.length > 0 && (
                        <div className="row between">
                          <span className="muted">Preferências</span>
                          <span>{reg.registration_selections.map((sel) => sel.event_options.name).join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-footer" style={{ borderTop: 'none', display: 'flex', gap: '12px' }}>
                      <Link to={`/e/${reg.events.slug}`} className="btn secondary small" style={{ flex: 1 }}>
                        Ver Detalhes
                      </Link>
                      <button
                        className="btn small"
                        onClick={() => handleCancel(reg.id)}
                        disabled={cancelingId === reg.id}
                        style={{
                          background: 'var(--error-bg)',
                          color: 'var(--error)',
                          border: '1px solid var(--error)',
                          opacity: cancelingId === reg.id ? 0.5 : 1,
                          flex: 1
                        }}
                      >
                        {cancelingId === reg.id ? "..." : "Cancelar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="row" style={{ marginTop: '20px', gap: '12px' }}>
            <Link className="btn secondary" style={{ flex: 1, textAlign: 'center' }} to="/">
              Voltar para Eventos
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
