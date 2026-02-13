import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api";
import Header from "../../components/Header";

type OptionRow = {
  id: string;
  event_id: string;
  type: "drink" | "food";
  name: string;
  is_available: boolean;
  created_at: string;
};

export default function AdminEventOptions() {
  const { id } = useParams();
  const eventId = String(id);

  const [options, setOptions] = useState<OptionRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    try {
      const r = await apiGet<{ options: OptionRow[] }>(`/admin/events/${eventId}/options`);
      setOptions(r.options ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    if (!eventId) return;
    load();
  }, [eventId]);

  const drinks = useMemo(() => options.filter((o) => o.type === "drink"), [options]);

  async function add() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiPost(`/admin/events/${eventId}/options`, { type: "drink", name: name.trim(), is_available: true });
      setName("");
      await load();
    } catch (e: any) {
      setError("Erro ao adicionar opção.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(option: OptionRow) {
    try {
      await apiPatch(`/admin/options/${option.id}`, { is_available: !option.is_available });
      await load();
    } catch (e) {
      setError("Erro ao atualizar status.");
    }
  }

  async function rename(option: OptionRow, newName: string) {
    try {
      await apiPatch(`/admin/options/${option.id}`, { name: newName });
      await load();
    } catch (e) {
      setError("Erro ao renomear.");
    }
  }

  async function remove(option: OptionRow) {
    if (!confirm(`Deseja remover "${option.name}"?`)) return;
    try {
      await apiDelete(`/admin/options/${option.id}`);
      await load();
    } catch (e) {
      setError("Erro ao remover.");
    }
  }

  return (
    <>
      <Header title="Opções do Evento" />

      <div className="container fade-in" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight stagger-1" style={{ marginBottom: '24px' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 40px)', textAlign: 'left', margin: 0 }}>
                  Opções de <span className="gradient-text">Consumo</span>
                </h1>
                <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
                  Gerencie o que será oferecido no seu evento.
                </p>
              </div>
              <div className="row" style={{ gap: '12px' }}>
                <Link to={`/admin/events/${eventId}/stats`} className="btn small" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Estatísticas</Link>
                <Link to="/admin" className="btn small" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Painel</Link>
              </div>
            </div>
          </section>

          {error && (
            <div className="login-error stagger-2">
              {error}
            </div>
          )}

          <div className="card stagger-3" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="card-content">
              <div className="auth-form" style={{ gap: '24px' }}>
                <div className="field">
                  <span>Adicionar Nova Opção</span>
                  <div className="row" style={{ gap: '8px' }}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Gin Tônica, Cerveja, Água..."
                      onKeyDown={(e) => e.key === 'Enter' && add()}
                      style={{ flex: 1 }}
                    />
                    <button className="btn primary" onClick={add} disabled={loading || !name.trim()}>
                      {loading ? "..." : "Adicionar"}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div className="row between" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>Lista de Opções</h3>
                    <span className="muted small" style={{ fontWeight: 600 }}>{drinks.length} itens</span>
                  </div>

                  <div className="stack tight" style={{ padding: 0, gap: '12px' }}>
                    {drinks.length === 0 ? (
                      <div className="empty-state" style={{ padding: '32px' }}>
                        <p className="muted small">Nenhuma opção cadastrada ainda.</p>
                      </div>
                    ) : (
                      drinks.map((o) => (
                        <div key={o.id} className="card" style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                          <div className="row between">
                            <input
                              style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)', flex: 1 }}
                              defaultValue={o.name}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v !== o.name) rename(o, v);
                              }}
                            />
                            <div className="row" style={{ gap: '12px' }}>
                              <button
                                className={`status-badge ${o.is_available ? 'published' : 'draft'}`}
                                style={{ border: 'none', cursor: 'pointer', fontSize: '11px', padding: '4px 10px' }}
                                onClick={() => toggle(o)}
                              >
                                {o.is_available ? "Ativo" : "Inativo"}
                              </button>
                              <button
                                className="link-btn"
                                style={{ color: 'var(--error)', fontSize: '13px' }}
                                onClick={() => remove(o)}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <Link className="btn primary large full-width" to={`/admin/events/${eventId}/stats`}>
                    Ver Estatísticas
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
