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

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!editing) {
      // Gera slug automático: remove acentos, espaços vira -, remove caracteres especiais
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setSlug(generated);
    }
  }

  function handleSlugChange(val: string) {
    const sanitized = val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
  }
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
        if (r && r.id) {
          navigate(`/admin/events/${r.id}/options`);
        } else {
          throw new Error("Resposta do servidor inválida ao criar evento");
        }
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
      <Header title={id ? "Editar Evento" : "Novo Evento"} />
      <div className="container fade-in" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <section className="stack tight stagger-1" style={{ marginBottom: '24px' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', textAlign: 'left', margin: 0 }}>
                  {id ? 'Editar' : 'Novo'} <span className="gradient-text">Evento</span>
                </h1>
                <p className="hero-subtitle" style={{ textAlign: 'left', fontSize: '18px', margin: 0 }}>
                  Preencha os detalhes para {id ? 'atualizar sua festa' : 'criar uma nova festa'}.
                </p>
              </div>
              <Link to="/admin" className="btn small" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>Voltar ao Painel</Link>
            </div>
          </section>

          {error && (
            <div className="login-error stagger-2">
              {error}
            </div>
          )}

          <div className="card stagger-3" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div className="card-content">
              <div className="auth-form" style={{ gap: '32px' }}>
                <div className="field">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Título do Evento</label>
                  <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Ex: Aniversário do João" />
                </div>

                <div className="grid-2-1" style={{ gap: '24px' }}>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Slug (URL amigável)</label>
                    <input value={slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="aniversario-joao" />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicado</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Descrição</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Conte mais sobre a festa..." style={{ minHeight: '120px' }} />
                </div>

                <div className="cols-2" style={{ gap: '24px' }}>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Data e Hora</label>
                    <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Local</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Onde será?" />
                  </div>
                </div>

                <div className="cols-2" style={{ gap: '24px' }}>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Capacidade Máxima</label>
                    <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Fim das Inscrições</label>
                    <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Imagem de Capa</label>
                  <div style={{ 
                    border: '2px dashed var(--glass-border)', 
                    borderRadius: '16px', 
                    padding: coverImageUrl ? '8px' : '48px', 
                    textAlign: 'center',
                    background: coverImageUrl ? 'var(--bg-subtle)' : 'var(--glass-bg)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden'
                  }}>
                    {coverImageUrl ? (
                      <div style={{ position: 'relative', lineHeight: 0 }}>
                        <img src={coverImageUrl} alt="Capa" style={{ width: '100%', borderRadius: '12px', maxHeight: '400px', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', opacity: 0, transition: 'opacity 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }} className="image-hover-overlay">
                           <button
                            className="btn small"
                            style={{ background: 'white', color: 'black', border: 'none', fontWeight: 700 }}
                            onClick={() => setCoverImageUrl("")}
                          >
                            Remover
                          </button>
                        </div>
                        <button
                          className="btn small"
                          style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(10px)', border: 'none', fontSize: '11px' }}
                          onClick={() => setCoverImageUrl("")}
                        >
                          Trocar Imagem
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖼️</div>
                        <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Upload de Capa</p>
                        <p className="muted small" style={{ marginBottom: '24px' }}>PNG, JPG até 5MB</p>
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
                        <button className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '13px' }}>Selecionar Arquivo</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Galeria de Fotos (até 3)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <div style={{
                          width: '100%',
                          aspectRatio: '1',
                          background: 'var(--glass-bg)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid var(--glass-border)',
                          transition: 'all 0.2s ease'
                        }}>
                          {galleryUrls[idx] ? (
                            <>
                              <img src={galleryUrls[idx]} alt={`Galeria ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(0,0,0,0.6)', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '50%', 
                                  width: '24px', 
                                  height: '24px', 
                                  cursor: 'pointer',
                                  backdropFilter: 'blur(4px)',
                                  fontSize: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
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
                            <div style={{ textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Adicionar</span>
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
                    padding: '20px', 
                    background: 'var(--glass-bg)', 
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer'
                  }} onClick={() => setCreateDefaultDrinks(!createDefaultDrinks)}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: `2px solid ${createDefaultDrinks ? 'var(--primary)' : 'var(--glass-border)'}`,
                      background: createDefaultDrinks ? 'var(--primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      {createDefaultDrinks && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', margin: 0 }}>
                        Criar lista de bebidas padrão
                      </label>
                      <p style={{ fontSize: '12px', margin: '2px 0 0 0', opacity: 0.6 }}>Cerveja, Gin, Vodka, Refrigerante, etc.</p>
                    </div>
                  </div>
                )}

                <div className="row" style={{ marginTop: '16px', gap: '16px' }}>
                  <button 
                    className="btn primary" 
                    style={{ flex: 1, height: '52px', fontSize: '16px' }}
                    onClick={save}
                    disabled={loading || !canSave}
                  >
                    {loading ? "Salvando..." : (id ? "Atualizar Evento" : "Criar Evento")}
                  </button>
                  <Link 
                    to="/admin" 
                    className="btn" 
                    style={{ 
                      flex: 1, 
                      height: '52px', 
                      fontSize: '16px',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Cancelar
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
