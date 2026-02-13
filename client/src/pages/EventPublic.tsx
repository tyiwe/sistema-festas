import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../api";
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
  const navigate = useNavigate();
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
        const isRegistered = r.registrations.some((reg) => reg.events?.slug === slug);
        setAlreadyRegistered(isRegistered);
      })
      .catch(() => setAlreadyRegistered(false));
  }, [userLoggedIn, slug]);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  async function submit() {
    if (!slug) return;
    setError(null);
    setOk(null);

    if (fullName.trim().length < 3) {
      setError("Por favor, insira seu nome completo (mínimo 3 letras).");
      return;
    }

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
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <main className="stack">
          <div className="stack tight" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '16px' }}>
              {event.title.split(' ').map((word, i) => i === event.title.split(' ').length - 1 ? <span key={i} className="gradient-text">{word} </span> : word + ' ')}
            </h1>
            <div className="row center muted" style={{ gap: '16px', fontSize: '18px', fontWeight: 500 }}>
              <span className="row" style={{ gap: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {event.location}
              </span>
              <span>•</span>
              <span className="row" style={{ gap: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {new Date(event.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="form-card" style={{ padding: '6px', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
            <div className="row" style={{ gap: '4px' }}>
              <button 
                onClick={() => setTab("details")} 
                className={`btn ${tab === "details" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px' }}
              >
                Detalhes
              </button>
              <button 
                onClick={() => setTab("signup")} 
                className={`btn ${tab === "signup" ? "primary" : "ghost"}`}
                style={{ flex: 1, borderRadius: '10px', padding: '10px', fontSize: '14px' }}
              >
                Inscrição
              </button>
            </div>
          </div>

          {/* Error */}
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
              {!loadingAuth && !userLoggedIn ? (
                /* Bloqueio de Inscrição sem Login */
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                  <h3 style={{ marginBottom: '12px' }}>Login Necessário</h3>
                  <p className="muted" style={{ marginBottom: '24px' }}>
                    Para garantir a segurança dos eventos, você precisa estar logado para se inscrever.
                  </p>
                  <button className="btn primary full-width" onClick={() => navigate("/user-auth")}>
                    Fazer Login ou Cadastrar-se
                  </button>
                </div>
              ) : alreadyRegistered ? (
                /* Já inscrito */
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                  <h3 style={{ marginBottom: '12px' }}>Você já está inscrito!</h3>
                  <p className="muted" style={{ marginBottom: '24px' }}>
                    Sua vaga está garantida. Confira os detalhes em sua área do cliente.
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
                        <p className="muted small" style={{ marginTop: '4px' }}>Confirme suas informações para a lista de convidados.</p>
                      </div>
                      <div className="field">
                        <span>Nome Completo</span>
                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como devemos te chamar?" />
                      </div>
                      <div className="field">
                        <span>E-mail</span>
                        <input type="email" value={email} disabled style={{ opacity: 0.6 }} />
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
                        disabled={fullName.trim().length < 3 || !phone.trim()}
                      >
                        Continuar
                      </button>
                    </div>
                  )}

                  {/* Step 2: Options */}
                  {step === 2 && (
                    <div className="stack tight" style={{ padding: 0 }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <h3>Bebidas</h3>
                        <p className="muted small" style={{ marginTop: '4px' }}>Selecione o que você gostaria de beber.</p>
                      </div>
                      
                      <div className="options-grid" style={{ display: 'grid', gap: '12px' }}>
                        {options.length > 0 ? options.map((o) => (
                          <label key={o.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '16px', 
                            background: 'var(--bg-alt)', 
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            border: selected[o.id] ? '1px solid var(--primary)' : '1px solid transparent'
                          }}>
                            <input
                              type="checkbox"
                              checked={selected[o.id]}
                              onChange={(e) => setSelected({ ...selected, [o.id]: e.target.checked })}
                              style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontWeight: 500 }}>{o.name}</span>
                          </label>
                        )) : (
                          <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>Este evento não possui opções de bebidas.</p>
                        )}
                      </div>

                      <div className="field" style={{ marginTop: '12px' }}>
                        <span>Observações Adicionais</span>
                        <textarea 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)} 
                          placeholder="Algo mais que precisamos saber?"
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: 'var(--radius-sm)', 
                            background: 'var(--bg-alt)', 
                            border: 'none',
                            minHeight: '80px',
                            color: 'var(--text)'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button className="btn ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>Voltar</button>
                        <button className="btn primary" onClick={submit} style={{ flex: 2 }}>Confirmar Inscrição</button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                      <h2 style={{ marginBottom: '12px' }}>Tudo pronto!</h2>
                      <p className="muted" style={{ marginBottom: '32px' }}>
                        Sua inscrição em <strong>{event.title}</strong> foi realizada com sucesso.
                      </p>
                      <Link className="btn primary full-width" to="/my-registrations">
                        Ver Meus Convites
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
