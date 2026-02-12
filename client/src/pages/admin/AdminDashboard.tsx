import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../api";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  location: string;
  status: "draft" | "published";
  created_at: string;
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await apiGet<{ events: EventRow[] }>("/admin/events");
      setEvents(r.events);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [events]);

  return (
    <>
      <header className="topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Link className="brand" to="/admin">Painel</Link>
          <nav className="nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link to="/" style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>Voltar ao Site</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <main className="stack">
          <section className="row between" style={{ alignItems: 'flex-end', paddingTop: '16px' }}>
            <div>
              <h1 style={{ fontSize: '40px' }}>Seus Eventos</h1>
              <p className="muted" style={{ marginTop: '4px' }}>Gerencie suas festas e acompanhe as inscrições.</p>
            </div>
            <Link to="/admin/new" className="btn primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Criar Evento
            </Link>
          </section>

          {error && (
            <div style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 59, 48, 0.06)',
              border: '1px solid rgba(255, 59, 48, 0.15)',
              color: '#ff3b30',
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
                    <rect x="8" y="10" width="32" height="28" rx="4" stroke="#d2d2d7" strokeWidth="2" fill="none"/>
                    <path d="M8 18H40" stroke="#d2d2d7" strokeWidth="2"/>
                    <path d="M16 6V14M32 6V14" stroke="#d2d2d7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Nenhum evento criado ainda</h3>
                <p>Crie seu primeiro evento para começar.</p>
                <Link to="/admin/new" className="btn primary" style={{ marginTop: '20px' }}>Criar Primeiro Evento</Link>
              </div>
            ) : (
              sorted.map((e) => (
                <div key={e.id} className="admin-event-row">
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '19px' }}>{e.title}</h3>
                        <span className={`status-badge ${e.status}`}>
                          {e.status === 'published' ? 'Ativo' : 'Rascunho'}
                        </span>
                      </div>
                      <div className="muted small">
                        {new Date(e.date_time).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })} &middot; {e.location}
                      </div>
                    </div>

                    <div className="row wrap" style={{ gap: '8px' }}>
                      <Link className="btn secondary small" to={`/admin/edit/${e.id}`}>Editar</Link>
                      <Link className="btn secondary small" to={`/admin/events/${e.id}/options`}>Bebidas</Link>
                      <Link className="btn secondary small" to={`/admin/events/${e.id}/stats`}>Estatísticas</Link>
                      <a className="btn ghost small" href={`/e/${e.slug}`} target="_blank" rel="noreferrer">
                        Ver Site
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '4px' }}>
                          <path d="M4 2H10V8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </>
  );
}
