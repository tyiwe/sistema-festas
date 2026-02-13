import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../api";

import Header from "../../components/Header";

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
  const navigate = useNavigate();

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
        const g = (ev.gallery_image_urls ?? []) as any;
        const arr = Array.isArray(g) ? g.map(String) : [];
        setGalleryUrls([arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""]);
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

    const baseUrl = (import.meta as any).env.VITE_API_BASE || "";
    const r = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) throw new Error(j?.error || "Falha no upload");
    return String(j.url);
  }

  async function save() {
    console.log("Saving event, editing:", editing, "id:", id);
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

      console.log("Payload to save:", JSON.stringify(payload));

      if (!editing) payload.create_default_drinks = createDefaultDrinks;

      if (editing) {
        const res = await apiPut(`/admin/events/${id}`, payload);
        console.log("Update response:", res);
        navigate("/admin");
      } else {
        const r = await apiPost<{ id: string }>(`/admin/events`, payload);
        console.log("Create response:", r);
        navigate(`/admin/events/${r.id}/options`);
      }
    } catch (e: any) {
      console.error("Error saving event:", e);
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight" style={{ marginBottom: '24px' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', textAlign: 'left', margin: 0 }}>
                  {id ? 'Editar' : 'Novo'} <span className="gradient-text">Evento</span>
                </h1>
                <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
                  Preencha os detalhes para {id ? 'atualizar sua festa' : 'criar uma nova festa'}.
                </p>
              </div>
              <Link to="/admin" className="btn secondary small">Voltar ao Painel</Link>
            </div>
          </section>

          {error && (
            <div style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--error-bg)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              fontSize: '15px'
            }}>
              {error}
            </div>
          )}

          <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="stack tight" style={{ padding: 0 }}>
              <div className="field">
                <label>Título do Evento</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aniversário do João" />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="field">
                  <label>Slug (URL amigável)</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="aniversario-joao" />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Conte mais sobre a festa..." />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="field">
                  <label>Data e Hora</label>
                  <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                </div>
                <div className="field">
                  <label>Local</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Onde será?" />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="field">
                  <label>Capacidade Máxima</label>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="field">
                  <label>Fim das Inscrições</label>
                  <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
                </div>
              </div>

              <div className="field" style={{ marginTop: '16px' }}>
                <label>Imagem de Capa</label>
                <div style={{ 
                  marginTop: '8px', 
                  border: '2px dashed var(--border)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '24px', 
                  textAlign: 'center',
                  background: coverImageUrl ? 'transparent' : 'var(--bg-alt)',
                  position: 'relative'
                }}>
                  {coverImageUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img src={coverImageUrl} alt="Capa" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '300px', objectFit: 'cover' }} />
                      <button
                        className="btn"
                        style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(10px)' }}
                        onClick={() => setCoverImageUrl("")}
                      >
                        Trocar Imagem
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
                      <p className="muted small" style={{ marginBottom: '16px' }}>Arraste ou clique para enviar a imagem de capa</p>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          opacity: 0, 
                          cursor: 'pointer' 
                        }}
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
                      <button className="btn primary small">Selecionar Arquivo</button>
                    </>
                  )}
                </div>
              </div>

              <div className="field" style={{ marginTop: '24px' }}>
                <label>Galeria de Fotos (até 3)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{
                        width: '100%',
                        aspectRatio: '1',
                        background: 'var(--bg-alt)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '1px solid var(--border)'
                      }}>
                        {galleryUrls[idx] ? (
                          <>
                            <img src={galleryUrls[idx]} alt={`Galeria ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              style={{ 
                                position: 'absolute', 
                                top: '8px', 
                                right: '8px', 
                                background: 'rgba(0,0,0,0.5)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: '24px', 
                                height: '24px', 
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)'
                              }}
                              onClick={() => {
                                const newUrls = [...galleryUrls];
                                newUrls[idx] = "";
                                setGalleryUrls(newUrls);
                              }}
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>📷</div>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                width: '100%', 
                                height: '100%', 
                                opacity: 0, 
                                cursor: 'pointer' 
                              }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setLoading(true);
                                  const url = await uploadImage(file);
                                  const newUrls = [...galleryUrls];
                                  newUrls[idx] = url;
                                  setGalleryUrls(newUrls);
                                } catch (err: any) {
                                  setError(String(err?.message ?? err));
                                } finally {
                                  setLoading(false);
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!editing && (
                <div style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  background: 'rgba(0, 113, 227, 0.05)', 
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <input 
                    type="checkbox" 
                    id="default-drinks" 
                    checked={createDefaultDrinks} 
                    onChange={(e) => setCreateDefaultDrinks(e.target.checked)}
                    style={{ 
                      width: '20px', 
                      height: '20px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="default-drinks" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)', margin: 0 }}>
                    Criar lista de bebidas padrão automaticamente
                  </label>
                </div>
              )}

              <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                <button 
                  className="btn primary-glow large" 
                  style={{ flex: 1, height: '56px', fontSize: '16px' }} 
                  disabled={!canSave || loading} 
                  onClick={save}
                >
                  {loading ? "Salvando..." : (editing ? "Salvar Alterações" : "Criar e Continuar")}
                </button>
                <button 
                  className="btn large" 
                  style={{ flex: 1, height: '56px', fontSize: '16px', background: 'var(--bg-alt)' }} 
                  onClick={() => navigate("/admin")}
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
