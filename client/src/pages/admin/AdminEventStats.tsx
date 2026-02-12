import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../../api";

type DrinkCount = {
  option_id: string;
  name: string;
  count: number;
  is_available: boolean;
};

type Stats = {
  total_registrations: number;
  drink_counts: DrinkCount[];
};

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  allergies: string | null;
  notes: string | null;
  created_at: string;
  selections: Array<{
    option_id: string;
    name: string;
    type: string;
  }>;
};

type RegistrationsResponse = {
  registrations: Registration[];
};

export default function AdminEventStats() {
  const { id } = useParams();
  const eventId = String(id);

  const [stats, setStats] = useState<Stats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "registrations">("stats");

  useEffect(() => {
    apiGet<Stats>(`/admin/events/${eventId}/stats`)
      .then(setStats)
      .catch((e: any) => setError(String(e?.message ?? e)));

    apiGet<RegistrationsResponse>(`/admin/events/${eventId}/registrations`)
      .then((data) => setRegistrations(data.registrations))
      .catch((e: any) => setError(String(e?.message ?? e)));
  }, [eventId]);

  const max = useMemo(() => {
    return Math.max(1, ...(stats?.drink_counts ?? []).map((d) => d.count));
  }, [stats]);

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

          {!stats || registrations.length === 0 && activeTab === "registrations" ? (
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
                  {/* Stat Cards */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                      <div className="stat-label">Total de Inscritos</div>
                      <div className="stat-value">{stats.total_registrations}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Opções Ativas</div>
                      <div className="stat-value">{stats.drink_counts.filter(d => d.is_available).length}</div>
                    </div>
                  </div>

                  {/* Drink Preferences Chart */}
                  <div className="form-card" style={{ maxWidth: '100%', marginTop: '12px' }}>
                    <h3 style={{ marginBottom: '28px' }}>Preferências de Consumo</h3>

                    <div className="stack tight" style={{ padding: 0, gap: '20px' }}>
                      {stats.drink_counts.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px' }}>
                          <p className="muted">Nenhum dado de preferência disponível ainda.</p>
                        </div>
                      ) : (
                        stats.drink_counts.map((d) => (
                          <div key={d.option_id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="row between">
                              <div className="row" style={{ gap: '8px' }}>
                                <span style={{ fontWeight: 500, fontSize: '15px' }}>{d.name}</span>
                                {!d.is_available && (
                                  <span className="status-badge draft" style={{ fontSize: '10px' }}>Inativo</span>
                                )}
                              </div>
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
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                      }}>
                        <thead>
                          <tr style={{
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-alt)'
                          }}>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Nome</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>E-mail</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Telefone</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Bebidas</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Alergias</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr
                              key={reg.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-alt)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.01)';
                              }}
                            >
                              <td style={{ padding: '16px', fontWeight: 500 }}>{reg.full_name}</td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                                <a href={`mailto:${reg.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                  {reg.email}
                                </a>
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                                <a href={`tel:${reg.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                  {reg.phone}
                                </a>
                              </td>
                              <td style={{ padding: '16px' }}>
                                {reg.selections.length === 0 ? (
                                  <span className="status-badge draft">Nenhuma</span>
                                ) : (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {reg.selections.map((sel) => (
                                      <span
                                        key={sel.option_id}
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          background: 'rgba(0, 113, 227, 0.1)',
                                          color: 'var(--primary)',
                                          fontSize: '12px',
                                          fontWeight: 500
                                        }}
                                      >
                                        {sel.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {reg.allergies ? (
                                  <span title={reg.allergies} style={{ cursor: 'help' }}>
                                    {reg.allergies.length > 20 ? reg.allergies.substring(0, 20) + '...' : reg.allergies}
                                  </span>
                                ) : (
                                  <span style={{ opacity: 0.5 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {new Date(reg.created_at).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="row" style={{ marginTop: '20px', gap: '12px' }}>
                <Link className="btn secondary" style={{ flex: 1, textAlign: 'center' }} to="/admin">
                  Voltar para Eventos
                </Link>
                <a
                  className="btn ghost"
                  style={{ flex: 1, textAlign: 'center' }}
                  href={`/api/admin/events/${eventId}/registrations`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Exportar Dados (JSON)
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '6px' }}>
                    <path d="M4 2H10V8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
