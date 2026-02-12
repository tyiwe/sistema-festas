import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import Header from "../components/Header";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  location: string;
  cover_image_url?: string | null;
  gallery_image_urls?: string[] | null;
};

type OptionRow = {
  id: string;
  event_id: string;
  type: "drink" | "food";
  name: string;
  is_available: boolean;
};

export default function EventPublic() {
  const { slug } = useParams();
  const loc = useLocation();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [tab, setTab] = useState<"details" | "signup">("signup");
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Verificar autenticação
  useEffect(() => {
    async function checkAuth() {
      try {
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        setUserLoggedIn(meRes.authenticated);
      } catch {
        setUserLoggedIn(false);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(loc.search);
    const t = qs.get("tab");
    if (t === "details") setTab("details");
    if (t === "signup") setTab("signup");
  }, [loc.search]);

  useEffect(() => {
    if (!slug) return;
    apiGet<{ event: EventRow; options: OptionRow[] }>(`/public/events/${slug}`)
      .then((r) => {
        setEvent(r.event);
        setOptions(r.options ?? []);
        const initial: Record<string, boolean> = {};
        for (const o of r.options ?? []) initial[o.id] = false;
        setSelected(initial);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, [slug]);

  // Carregar dados do usuario e verificar inscricao
  useEffect(() => {
    if (!userLoggedIn || !slug) return;
    
    // Carregar dados do usuario para preenchimento automatico
    apiGet<{ user: any }>("/user/profile")
      .then((r) => {
        setFullName(r.user.full_name || "");
        setEmail(r.user.email || "");
        setPhone(r.user.phone || "");
      })
      .catch(() => {});
    
    // Verificar se ja esta inscrito
    apiGet<{ registrations: any[] }>("/user/my-registrations")
      .then((r) => {
        const isRegistered = r.registrations.some((reg) => reg.events.slug === slug);
        setAlreadyRegistered(isRegistered);
      })
      .catch(() => setAlreadyRegistered(false));
  }, [userLoggedIn, slug]);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  async function submit() {
    if (!slug) return;
    setError(null);
    setOk(null);

    try {
      await apiPost(`/public/events/${slug}/register`, {
        full_name: fullName,
        email,
        phone,
        allergies,
        notes,
        selections: selectedIds,
      });
      setStep(3);
      setOk("Inscrição confirmada!");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  if (!event) {
    return (
      <>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
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
            <p className="muted" style={{ fontSize: '15px' }}>Carregando evento...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="container">
        <main className="stack">
          {/* Event Hero */}
          <section className="event-hero">
            <h1>{event.title}</h1>
            <p className="event-meta">
              {new Date(event.date_time).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
              {' '}&middot;{' '}{event.location}
            </p>

            {event.cover_image_url && (
              <div className="heroMedia">
                <img src={event.cover_image_url} alt="" />
              </div>
            )}
          </section>

          {/* Tabs */}
          <div className="segmented">
            <button
              className={`segItem ${tab === "signup" ? "active" : ""}`}
              onClick={() => setTab("signup")}
            >
              Inscrição
            </button>
            <button
              className={`segItem ${tab === "details" ? "active" : ""}`}
              onClick={() => setTab("details")}
            >
              Detalhes
            </button>
          </div>

          {/* Error */}
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

          {/* Details Tab */}
          {tab === "details" ? (
            <div className="details-card">
              <div className="stack tight" style={{ padding: 0 }}>
                <h3>Sobre o evento</h3>
                <p className="muted" style={{ lineHeight: '1.6' }}>
                  {event.description || "Sem descrição disponível."}
                </p>

                <div className="grid" style={{ marginTop: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div style={{ padding: '20px', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="small muted" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Localização</span>
                    <span style={{ fontWeight: 500 }}>{event.location}</span>
                  </div>
                  <div style={{ padding: '20px', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="small muted" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Data e Hora</span>
                    <span style={{ fontWeight: 500 }}>{new Date(event.date_time).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {event.gallery_image_urls && event.gallery_image_urls.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <span className="small muted" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Galeria</span>
                    <div className="gallery">
                      {event.gallery_image_urls.map((u, i) => (
                        <img key={i} src={u} alt="" />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                  <button className="btn primary large" onClick={() => setTab("signup")}>
                    Quero me inscrever
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Signup Tab */
            <div className="form-card">
              {/* Verificar se já está inscrito */}
              {!loadingAuth && userLoggedIn && alreadyRegistered ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                  <h3 style={{ marginBottom: '12px' }}>Você já está inscrito!</h3>
                  <p className="muted" style={{ marginBottom: '24px' }}>
                    Você já se inscreveu neste evento. Confira sua inscrição em "Minhas Inscrições".
                  </p>
                  <Link className="btn primary" to="/my-registrations">
                    Ver Minhas Inscrições
                  </Link>
                </div>
              ) : (
                <>
                  {/* Stepper */}
                  <div className="stepper">
                    <div className={`step ${step >= 1 ? "active" : ""}`} />
                    <div className={`step ${step >= 2 ? "active" : ""}`} />
                    <div className={`step ${step >= 3 ? "active" : ""}`} />
                  </div>

                  {/* Step 1: Personal info */}
                  {step === 1 && (
                    <div className="stack tight" style={{ padding: 0 }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <h3>Seus dados</h3>
                        <p className="muted small" style={{ marginTop: '4px' }}>Precisamos de algumas informações para sua inscrição.</p>
                      </div>
                      <div className="field">
                        <span>Nome Completo</span>
                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como devemos te chamar?" />
                      </div>
                      <div className="field">
                        <span>E-mail</span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                      </div>
                      <div className="field">
                        <span>Telefone</span>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="field">
                        <span>Alergias ou Restrições</span>
                        <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Opcional" />
                      </div>

                      <button
                        className="btn primary full-width"
                        style={{ marginTop: '12px' }}
                        onClick={() => setStep(2)}
                        disabled={!fullName.trim() || !email.trim() || !phone.trim()}
                      >
                        Continuar
                      </button>
                    </div>
                  )}

                  {/* Step 2: Preferences */}
                  {step === 2 && (
                    <div className="stack tight" style={{ padding: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <h3>Preferências de bebida</h3>
                        <p className="muted small" style={{ marginTop: '4px', marginBottom: '24px' }}>
                          Selecione o que você gostaria de consumir. Isso ajuda na organização!
                        </p>
                      </div>

                      {options.length === 0 ? (
                        <div className="muted" style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)' }}>
                          Nenhuma opção de bebida cadastrada.
                        </div>
                      ) : (
                        <div className="chipGrid" style={{ justifyContent: 'center' }}>
                          {options.map((o) => (
                            <button
                              key={o.id}
                              className={`chip ${selected[o.id] ? "chipOn" : ""}`}
                              onClick={() => setSelected((s) => ({ ...s, [o.id]: !s[o.id] }))}
                            >
                              {o.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="field" style={{ marginTop: '16px' }}>
                        <span>Observações (opcional)</span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Algo que devemos saber?"
                          rows={3}
                        />
                      </div>

                      <div className="stack tight" style={{ marginTop: '16px', padding: 0 }}>
                        <button className="btn primary full-width" onClick={submit}>
                          Confirmar Inscrição
                        </button>
                        <button className="btn ghost full-width" onClick={() => setStep(1)}>
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div className="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 13L9 17L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h2 style={{ marginBottom: '12px' }}>Tudo pronto!</h2>
                      <p className="muted" style={{ marginBottom: '32px', fontSize: '17px', lineHeight: '1.5' }}>
                        Sua inscrição para <strong>{event.title}</strong> foi confirmada com sucesso.
                      </p>
                      <Link className="btn primary large" to="/">
                        Voltar para o início
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
