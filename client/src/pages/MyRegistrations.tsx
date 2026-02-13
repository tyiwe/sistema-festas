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
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p className="muted">Carregando inscrições...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 24px' }}>
              <div className="empty-state-icon">📋</div>
              <h3>Nenhuma inscrição encontrada</h3>
              <p>Você ainda não se inscreveu em nenhum evento.</p>
              <Link to="/" className="btn primary" style={{ marginTop: '20px' }}>
                Explorar Eventos
              </Link>
            </div>
          ) : (
            <div className="stack tight">
              {registrations.map((reg) => (
                <div key={reg.id} className="admin-event-row">
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '19px' }}>
                        {reg.events.title}
                      </h3>
                      <div className="muted small">
                        {new Date(reg.events.date_time).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })} &middot; {reg.events.location}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '14px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Seu Nome:</strong> {reg.full_name}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>E-mail:</strong> {reg.email}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Telefone:</strong> {reg.phone}
                        </div>
                        {reg.registration_selections.length > 0 && (
                          <div style={{ marginBottom: '6px' }}>
                            <strong>Bebidas:</strong>{" "}
                            {reg.registration_selections.map((sel) => sel.event_options.name).join(", ")}
                          </div>
                        )}
                        {reg.allergies && (
                          <div style={{ marginBottom: '6px' }}>
                            <strong>Alergias:</strong> {reg.allergies}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row wrap" style={{ gap: '8px' }}>
                      <a
                        className="btn secondary small"
                        href={`/e/${reg.events.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver Evento
                      </a>
                      <button
                        className="btn ghost small"
                        onClick={() => handleCancel(reg.id)}
                        disabled={cancelingId === reg.id}
                        style={{
                          color: 'var(--error)',
                          cursor: cancelingId === reg.id ? 'not-allowed' : 'pointer',
                          opacity: cancelingId === reg.id ? 0.5 : 1,
                        }}
                      >
                        {cancelingId === reg.id ? "Cancelando..." : "Cancelar"}
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
