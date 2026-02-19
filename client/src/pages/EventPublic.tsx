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

  // Efeito de parallax simples para a galeria
  useEffect(() => {
    if (tab !== "details") return;
    
    const handleScroll = () => {
      // Não aplicar efeito se for mobile (performance e evitar bugs visual)
      if (window.innerWidth < 900) return;

      const images = document.querySelectorAll('.parallax-img');
      images.forEach((img, i) => {
        const speed = (i + 1) * 0.1;
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const yOffset = (window.innerHeight - rect.top) * speed;
          (img as HTMLElement).style.transform = `translateY(${yOffset * -0.2}px) ${i % 2 === 0 ? 'translateX(-10px)' : 'translateX(10px)'}`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
     return () => window.removeEventListener('scroll', handleScroll);
   }, [tab]);

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
            <p className="muted" style={{ fontSize: '15px' }}>Buscando os detalhes do rolê...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      
      {/* Immersive Hero Section */}
      <div className="event-hero-wrapper fade-in">
        <div className="event-hero-bg">
          <img src={event.cover_image_url || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop`} alt="" />
          <div className="event-hero-overlay"></div>
        </div>
        
        <div className="container">
          <div className="event-hero-content">
            <div className="status-badge published" style={{ marginBottom: '16px' }}>Rolê Confirmado</div>
            <h1 className="hero-title">{event.title}</h1>
            <div className="event-meta-row">
              <span className="meta-item">📅 {new Date(event.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="meta-divider">•</span>
              <span className="meta-item">📍 {event.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10, paddingBottom: '100px' }}>
        <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <Link to="/" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'white', 
            textDecoration: 'none', 
            fontSize: '14px', 
            marginBottom: '24px', 
            opacity: 0.8,
            fontWeight: 500 
          }} className="stagger-1">
            ← Voltar para a lista
          </Link>

          {/* Segmented Control Tabs */}
          <div className="segmented-control stagger-2" style={{ marginBottom: '32px' }}>
            <button 
              className={tab === "signup" ? "active" : ""} 
              onClick={() => setTab("signup")}
            >
              Garantir Vaga
            </button>
            <button 
              className={tab === "details" ? "active" : ""} 
              onClick={() => setTab("details")}
            >
              O que vai ter?
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error stagger-2">
              {error}
            </div>
          )}

          {/* Tab Content */}
          <div className="stagger-3">
            {tab === "details" ? (
              <div className="details-layout">
                {/* Info Column */}
                <div className="sticky-info">
                  <div className="login-card" style={{ maxWidth: 'none', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>Sobre o evento</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontSize: '17px', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
                      {event.description || "O organizador ainda não soltou a descrição completa, mas pode ter certeza que vai ser épico!"}
                    </p>

                    <div className="stack" style={{ gap: '16px' }}>
                      <div className="bento-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '24px' }}>📍</div>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Onde</span>
                          <span style={{ fontSize: '16px', fontWeight: 600 }}>{event.location}</span>
                        </div>
                      </div>
                      <div className="bento-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '24px' }}>📅</div>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Quando</span>
                          <span style={{ fontSize: '16px', fontWeight: 600 }}>{new Date(event.date_time).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '40px' }}>
                      <button className="btn primary large full-width" onClick={() => setTab("signup")}>
                        Quero me inscrever agora
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gallery Column */}
                <div className="scrolling-gallery">
                  {event.gallery_image_urls && event.gallery_image_urls.length > 0 ? (
                    event.gallery_image_urls.map((url, i) => (
                      <img 
                        key={i} 
                        src={url} 
                        alt={`Gallery ${i}`} 
                        className="parallax-img animate-float"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))
                  ) : (
                    <div className="login-card" style={{ textAlign: 'center', opacity: 0.5, padding: '60px 20px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '16px' }}>📸</div>
                      <p>As fotos estão chegando...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Registration Form */
              <div className="login-card" style={{ maxWidth: 'none' }}>
                {!loadingAuth && !userLoggedIn ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔒</div>
                    <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Acesso Restrito</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                      Pra garantir sua segurança e a organização do rolê, você precisa estar logado para se inscrever.
                    </p>
                    <button className="btn primary large full-width" onClick={() => navigate("/user-auth")}>
                      Entrar ou Criar Conta
                    </button>
                  </div>
                ) : alreadyRegistered ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>✨</div>
                    <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Presença Confirmada!</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                      Você já está na lista! Agora é só preparar o look e aproveitar a festa.
                    </p>
                    <Link to="/" className="btn primary">Voltar ao Início</Link>
                  </div>
                ) : (
                  <>
                    <div className="stepper" style={{ marginBottom: '40px' }}>
                      <div className={`step ${step >= 1 ? "active" : ""}`} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 1 ? 'var(--primary)' : 'var(--border)' }}></div>
                      <div className={`step ${step >= 2 ? "active" : ""}`} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? 'var(--primary)' : 'var(--border)' }}></div>
                      <div className={`step ${step >= 3 ? "active" : ""}`} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 3 ? 'var(--primary)' : 'var(--border)' }}></div>
                    </div>

                    {step === 1 && (
                      <div className="auth-form">
                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '22px' }}>Só pra gente saber quem vai estar lá</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Confirme seus dados para a lista oficial.</p>
                        </div>
                        <div className="field">
                          <span>Nome Completo (pra lista na porta)</span>
                          <input 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            placeholder="Como você quer aparecer na lista?" 
                          />
                        </div>
                        <div className="field">
                          <span>E-mail</span>
                          <input type="email" value={email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        </div>
                        <div className="field">
                          <span>WhatsApp / Telefone</span>
                          <input 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="(00) 00000-0000" 
                          />
                        </div>
                        <div className="field">
                          <span>Restrições, alergias... conta pra gente</span>
                          <input 
                            value={allergies} 
                            onChange={(e) => setAllergies(e.target.value)} 
                            placeholder="Alguma observação importante?" 
                          />
                        </div>
                        <button 
                          className="btn primary large full-width" 
                          style={{ marginTop: '12px' }}
                          disabled={fullName.trim().length < 3 || !phone.trim()}
                          onClick={() => setStep(2)}
                        >
                          Próximo Passo
                        </button>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="auth-form">
                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '22px' }}>O que não pode faltar pra você?</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Personalize sua experiência no evento.</p>
                        </div>

                        {options.length > 0 && (
                          <div className="field">
                            <span>O que você gostaria de beber?</span>
                            <div className="options-grid">
                              {options.map((o) => (
                                <div 
                                  key={o.id} 
                                  className={`option-item ${selected[o.id] ? 'selected' : ''}`}
                                  onClick={() => setSelected({ ...selected, [o.id]: !selected[o.id] })}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={selected[o.id]} 
                                    onChange={() => {}} // Handle via parent click
                                  />
                                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{o.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="field">
                          <span>Alguma dúvida ou recado pra organização?</span>
                          <textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Algo mais que gostaria de nos contar?"
                            rows={4}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                          <button className="btn secondary large" style={{ flex: 1 }} onClick={() => setStep(1)}>Voltar</button>
                          <button className="btn primary large" style={{ flex: 2 }} onClick={submit}>Finalizar Inscrição</button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '80px', marginBottom: '24px' }}>🥂</div>
                        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Tudo certo!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '16px', maxWidth: '440px', margin: '0 auto 40px' }}>
                          Parabéns, sua vaga em <strong>{event.title}</strong> está garantida! Agora é só se preparar e aproveitar.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                          <Link to="/my-registrations" className="btn primary large">Ver Meu Ingresso</Link>
                          <Link to="/" className="btn secondary large">Voltar para a Home</Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
