import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../../api";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  location: string;
  status: "draft" | "published";
  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;
  registration_deadline?: string | null;
  capacity?: number | null;
};

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEventForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [capacity, setCapacity] = useState<string>("");
  const [registrationDeadline, setRegistrationDeadline] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(["", "", ""]);
  const [createDefaultDrinks, setCreateDefaultDrinks] = useState(true);

  useEffect(() => {
    if (!editing) return;
    setLoading(true);
    apiGet<{ events: EventRow[] }>("/admin/events")
      .then((r) => {
        const ev = r.events.find((e) => e.id === id);
        if (!ev) throw new Error("Evento não encontrado");
        setTitle(ev.title);
        setSlug(ev.slug);
        setDescription(ev.description ?? "");
        setDateTime(toDatetimeLocal(ev.date_time));
        setLocation(ev.location);
        setStatus(ev.status);
        setCapacity(ev.capacity ? String(ev.capacity) : "");
        setRegistrationDeadline(toDatetimeLocal(ev.registration_deadline ?? null));
        setCoverImageUrl(ev.cover_image_url ?? "");
        
        const g = ev.gallery_image_urls || [];
        setGalleryUrls([g[0] || "", g[1] || "", g[2] || ""]);
      })
      .catch((e: any) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const canSave = useMemo(() => {
    return title.trim() && slug.trim() && dateTime.trim() && location.trim();
  }, [title, slug, dateTime, location]);

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    if (editing && id) fd.append("event_id", id);

    // Usa a mesma lógica do api.ts para a URL base
    const envBase = (import.meta as any).env.VITE_API_BASE || "";
    const cleanBase = envBase.replace(/\/$/, "");
    const uploadUrl = cleanBase ? `${cleanBase}/api/admin/upload` : "/api/admin/upload";

    const r = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) throw new Error(j?.error || "Falha no upload");
    return String(j.url);
  }

  async function save() {
    setError(null);
    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        date_time: dateTime,
        location: location.trim(),
        status,
        capacity: capacity ? Number(capacity) : null,
        registration_deadline: registrationDeadline ? registrationDeadline : null,
        cover_image_url: coverImageUrl.trim() ? coverImageUrl.trim() : null,
        gallery_image_urls: galleryUrls.map((u) => u.trim()).filter(Boolean),
      };

      if (!editing) payload.create_default_drinks = createDefaultDrinks;

      if (editing) {
        // Alinhado com o servidor que usa PUT para atualização
        await apiPost(`/admin/events/${id}`, payload, "PUT" as any);
        nav("/admin");
      } else {
        const r = await apiPost<{ id: string }>(`/admin/events`, payload);
        nav(`/admin/events/${r.id}/stats`);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="admin-topbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Link className="brand" to="/admin">Painel</Link>
          <nav className="nav">
            <Link to="/admin">Voltar</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <main className="stack">
          <section style={{ textAlign: 'center', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '40px' }}>{editing ? "Editar Evento" : "Novo Evento"}</h1>
            <p className="muted" style={{ marginTop: '4px' }}>Preencha os detalhes da sua festa.</p>
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

          <div className="form-card" style={{ maxWidth: '760px' }}>
            <div className="stack tight" style={{ padding: 0 }}>
              <div className="field">
                <span>Título do Evento</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aniversário do João" />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <span>Slug (URL amigável)</span>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="aniversario-joao" />
                </div>
                <div className="field">
                  <span>Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <span>Descrição</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Conte mais sobre a festa..." />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <span>Data e Hora</span>
                  <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                </div>
                <div className="field">
                  <span>Local</span>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Onde será?" />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <span>Capacidade Máxima</span>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="field">
                  <span>Fim das Inscrições</span>
                  <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
                </div>
              </div>

              <div className="field" style={{ marginTop: '8px' }}>
                <span>Imagem de Capa</span>
                <div style={{ marginTop: '4px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ fontSize: '14px' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setLoading(true);
                        const url = await uploadImage(file);
                        setCoverImageUrl(url);
                      } catch (err: any) {
                        setError(String(err?.message ?? err));
                      } finally {
                        setLoading(false);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
                {coverImageUrl && (
                  <div style={{ marginTop: '12px', position: 'relative' }}>
                    <img src={coverImageUrl} alt="Capa" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '200px', objectFit: 'cover' }} />
                    <button
                      className="btn secondary small"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                      onClick={() => setCoverImageUrl("")}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '28px', paddingTop: '28px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '16px' }}>Galeria de Fotos</h3>
                <p className="muted small" style={{ marginBottom: '16px' }}>Adicione até 3 fotos adicionais do seu evento.</p>
                
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {galleryUrls[idx] ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={galleryUrls[idx]}
                            alt={`Galeria ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '150px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--border)'
                            }}
                          />
                          <button
                            className="btn ghost small"
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0, 0, 0, 0.6)',
                              color: '#fff',
                              padding: '4px 8px'
                            }}
                            onClick={() => {
                              const newGallery = [...galleryUrls];
                              newGallery[idx] = "";
                              setGalleryUrls(newGallery);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          height: '150px',
                          border: '2px dashed var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setLoading(true);
                                const url = await uploadImage(file);
                                const newGallery = [...galleryUrls];
                                newGallery[idx] = url;
                                setGalleryUrls(newGallery);
                              } catch (err: any) {
                                setError(String(err?.message ?? err));
                              } finally {
                                setLoading(false);
                              }
                            }}
                          />
                          <span style={{ fontSize: '24px', opacity: 0.3 }}>+</span>
                          <span style={{ fontSize: '12px', opacity: 0.5 }}>Foto {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!editing && (
                <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                  <input
                    type="checkbox"
                    id="defaultDrinks"
                    checked={createDefaultDrinks}
                    onChange={(e) => setCreateDefaultDrinks(e.target.checked)}
                  />
                  <label htmlFor="defaultDrinks" style={{ fontSize: '14px', cursor: 'pointer' }}>
                    Criar lista de bebidas padrão automaticamente
                  </label>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  className="btn primary large"
                  style={{ flex: 1 }}
                  disabled={!canSave || loading}
                  onClick={save}
                >
                  {loading ? "Salvando..." : editing ? "Atualizar Evento" : "Criar Evento"}
                </button>
                <button
                  className="btn secondary large"
                  onClick={() => nav("/admin")}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
