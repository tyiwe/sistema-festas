import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../../api";

type DrinkCount = {
  option_id: string;
  name: string;
  count: number;
  is_available: boolean;
};

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  allergies: string | null;
  notes: string | null;
  created_at: string;
  registration_selections: Array<{
    option_id: string;
    event_options: {
      name: string;
    };
  }>;
};

type StatsResponse = {
  total: number;
  registrations: Registration[];
  optionCounts: Record<string, number>;
};

export default function AdminEventStats() {
  const { id } = useParams();
  const eventId = String(id);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "registrations">("stats");

  useEffect(() => {
    setLoading(true);
    apiGet<StatsResponse>(`/admin/events/${eventId}/stats`)
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((e: any) => {
        console.error("Erro ao carregar stats:", e);
        setError("Não foi possível carregar os dados do evento.");
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const drinkCounts = useMemo(() => {
    if (!stats?.optionCounts) return [];
    return Object.entries(stats.optionCounts).map(([name, count]) => ({
      name,
      count
    }));
  }, [stats]);

  const max = useMemo(() => {
    const counts = drinkCounts.map(d => d.count);
    return counts.length > 0 ? Math.max(1, ...counts) : 1;
  }, [drinkCounts]);

  const registrations = stats?.registrations ?? [];

  return (
    <>
      <header className="topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Link className="brand" to="/admin">Painel</Link>
          <nav className="nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link to="/admin" style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>Eventos</Link>
            <Link to={`/admin/events/${eventId}/options`} style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>Bebidas</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <main className="stack">
          <section style={{ textAlign: 'center', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '40px' }}>Gerenciamento do Evento</h1>
            <p className="muted" style={{ marginTop: '4px' }}>Acompanhe as inscrições e preferências dos seus convidados.</p>
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

          {/* Tab Navigation */}
          <div className="segmented" style={{ marginBottom: '24px' }}>
            <button
              className={`segItem ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              Estatísticas
            </button>
            <button
              className={`segItem ${activeTab === "registrations" ? "active" : ""}`}
              onClick={() => setActiveTab("registrations")}
            >
              Inscritos ({registrations.length})
            </button>
          </div>

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
              <p className="muted">Carregando dados...</p>
            </div>
          ) : (
            <div className="stack tight" style={{ padding: 0 }}>
              {/* STATS TAB */}
              {activeTab === "stats" && stats && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                      <div className="stat-label">Total de Inscritos</div>
                      <div className="stat-value">{stats.total}</div>
                    </div>
                  </div>

                  <div className="form-card" style={{ maxWidth: '100%', marginTop: '12px' }}>
                    <h3 style={{ marginBottom: '28px' }}>Preferências de Consumo</h3>
                    <div className="stack tight" style={{ padding: 0, gap: '20px' }}>
                      {drinkCounts.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px' }}>
                          <p className="muted">Nenhum dado de preferência disponível ainda.</p>
                        </div>
                      ) : (
                        drinkCounts.map((d) => (
                          <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="row between">
                              <span style={{ fontWeight: 500, fontSize: '15px' }}>{d.name}</span>
                              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>{d.count}</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${(d.count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* REGISTRATIONS TAB */}
              {activeTab === "registrations" && (
                <div className="form-card" style={{ maxWidth: '100%', marginTop: '0' }}>
                  <h3 style={{ marginBottom: '28px' }}>Lista de Inscritos</h3>
                  {registrations.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <p className="muted">Nenhum inscrito ainda.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-alt)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Nome</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>E-mail</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Telefone</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Bebidas</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr key={reg.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.01)' }}>
                              <td style={{ padding: '16px' }}>{reg.full_name}</td>
                              <td style={{ padding: '16px' }}>{reg.email}</td>
                              <td style={{ padding: '16px' }}>{reg.phone}</td>
                              <td style={{ padding: '16px' }}>
                                {reg.registration_selections?.map(s => s.event_options?.name).join(", ") || "-"}
                              </td>
                              <td style={{ padding: '16px' }}>{new Date(reg.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
