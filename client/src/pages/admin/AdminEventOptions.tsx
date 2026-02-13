import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api";

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
      <header className="admin-topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Link className="brand" to="/admin">Painel</Link>
          <nav className="nav">
            <Link to="/admin">Eventos</Link>
            <Link to={`/admin/events/${eventId}/stats`}>Estatísticas</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <main className="stack">
          <section style={{ textAlign: 'center', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '40px' }}>Opções de Consumo</h1>
            <p className="muted" style={{ marginTop: '4px' }}>Gerencie o que será oferecido no seu evento.</p>
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

          <div className="form-card" style={{ maxWidth: '600px' }}>
            <div className="stack tight" style={{ padding: 0 }}>
              <h3>Adicionar Nova Opção</h3>
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

              <div style={{ marginTop: '28px' }}>
                <div className="row between" style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Lista de Opções</h3>
                  <span className="muted small" style={{ fontWeight: 500 }}>{drinks.length} itens</span>
                </div>

                <div className="stack tight" style={{ padding: 0, gap: '6px' }}>
                  {drinks.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <p className="muted small">Nenhuma opção cadastrada ainda.</p>
                    </div>
                  ) : (
                    drinks.map((o) => (
                      <div key={o.id} className="option-row">
                        <div style={{ flex: 1 }}>
                          <input
                            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '16px', fontWeight: 500 }}
                            defaultValue={o.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== o.name) rename(o, v);
                            }}
                          />
                        </div>
                        <div className="row" style={{ gap: '6px' }}>
                          <button
                            className="btn small"
                            style={{
                              fontSize: '12px',
                              padding: '4px 10px',
                              background: o.is_available ? 'rgba(0, 113, 227, 0.08)' : 'var(--bg-alt)',
                              color: o.is_available ? 'var(--primary)' : 'var(--text-muted)',
                              border: 'none',
                              borderRadius: '980px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={() => toggle(o)}
                          >
                            {o.is_available ? "Ativo" : "Inativo"}
                          </button>
                          <button
                            className="btn ghost small"
                            style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--error)' }}
                            onClick={() => remove(o)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <Link className="btn primary full-width" to={`/admin/events/${eventId}/stats`}>
                  Ver Estatísticas
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
