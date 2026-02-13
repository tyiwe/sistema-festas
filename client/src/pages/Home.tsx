import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Header from "../components/Header";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  location: string;
  cover_image_url?: string | null;
};

export default function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [user, setUser] = useState<{ full_name: string } | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState({ eventCount: 0, registrationCount: 0 });
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Buscar eventos
    apiGet<{ events: EventRow[] }>("/public/events")
      .then((r) => {
        // Apenas eventos publicados (o backend já filtra, mas por segurança reforçamos aqui se houver mudança futura)
        setEvents(r.events.filter(e => (e as any).status !== 'finished'));
      })
      .catch((e) => setError(String(e?.message ?? e)));

    // Buscar estatísticas reais
    apiGet<{ eventCount: number, registrationCount: number }>("/public/stats")
      .then(res => setStats(res))
      .catch(err => console.error("Erro ao carregar stats:", err));

    // Verificar autenticação
    apiGet<{ authenticated: boolean }>("/user/me")
      .then(async (meRes) => {
        if (meRes.authenticated) {
          const profileRes = await apiGet<{ user: { full_name: string } }>("/user/profile");
          setUser(profileRes.user);
          
          // Buscar inscrições do usuário para mostrar atalhos
          const regsRes = await apiGet<{ registrations: any[] }>("/user/my-registrations");
          setMyRegistrations(regsRes.registrations || []);
        }
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [events]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...events]
      .sort((a, b) => +new Date(a.date_time) - +new Date(b.date_time))
      .filter((e) => {
        const t = new Date(e.date_time).getTime();
        const isRegistered = myRegistrations.some(reg => reg.event_id === e.id);
        return !isRegistered && (Number.isNaN(t) ? true : t >= now - 24 * 60 * 60 * 1000);
      });
  }, [events, myRegistrations]);

  return (
    <>
      <Header />

      <main>
        <section className="hero-section fade-in">
          <div className="hero-content stagger-1">
            <div className="status-badge draft" style={{ marginBottom: '24px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', textTransform: 'none', fontWeight: 500 }}>
              ✨ Nova experiência premium de eventos
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1.1, letterSpacing: '-0.05em' }}>
              Sua próxima <span className="gradient-text">festa</span><br />começa aqui.
            </h1>
            <p className="hero-subtitle" style={{ maxWidth: '600px', margin: '24px auto 40px', fontSize: 'clamp(18px, 3vw, 20px)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              A plataforma definitiva para descobrir, se inscrever e aproveitar os melhores eventos da região com check-in inteligente e experiência premium.
            </p>
            <div className="hero-btns" style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
              <button 
                onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn primary large"
                style={{ padding: '16px 32px', fontSize: '16px' }}
              >
                Explorar Eventos
              </button>
              {user ? (
                <Link to="/my-registrations" className="btn secondary large" style={{ padding: '16px 32px', fontSize: '16px' }}>
                  Minhas Inscrições
                </Link>
              ) : (
                <Link to="/user-auth" className="btn secondary large" style={{ padding: '16px 32px', fontSize: '16px' }}>
                  Criar Conta
                </Link>
              )}
            </div>
          </div>

          {/* Product Preview Element */}
          <div className="stagger-3" style={{ 
            marginTop: '80px', 
            width: '100%', 
            maxWidth: '1000px', 
            position: 'relative',
            padding: '0 24px',
            marginBottom: '60px'
          }}>
            <div style={{ 
              background: 'var(--bg-subtle)', 
              borderRadius: '32px', 
              border: '1px solid var(--border)', 
              padding: '8px',
              boxShadow: 'var(--card-shadow-hover)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                background: 'var(--bg)', 
                borderRadius: '24px', 
                height: '400px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                  <div className="row center" style={{ gap: '40px' }}>
                    <div className="stack tight">
                      <span style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {stats.eventCount > 0 ? `+${stats.eventCount}` : stats.eventCount}
                      </span>
                      <span className="muted small uppercase" style={{ letterSpacing: '0.1em', fontWeight: 600 }}>Eventos Ativos</span>
                    </div>
                    <div style={{ width: '1px', height: '60px', background: 'var(--border)' }} />
                    <div className="stack tight">
                      <span style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {stats.registrationCount >= 1000 ? `${(stats.registrationCount / 1000).toFixed(1)}k` : stats.registrationCount}
                      </span>
                      <span className="muted small uppercase" style={{ letterSpacing: '0.1em', fontWeight: 600 }}>Inscrições</span>
                    </div>
                  </div>
                </div>
                {/* Decorative mesh */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--gradient-mesh)', opacity: 0.5 }} />
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid de Destaques */}
        <section className="container fade-in stagger-4">
          <div className="bento-grid">
            <div className="bento-card" style={{ gridColumn: 'span 2', background: 'var(--primary-glow)' }}>
              <h3>Experiências Exclusivas</h3>
              <p>As melhores festas universitárias e eventos premium da região, com curadoria especial para você.</p>
            </div>
            <div className="bento-card">
              <h3>Check-in Instantâneo</h3>
              <p>Esqueça as filas. Com seu QR Code, a entrada é rápida e sem complicações.</p>
            </div>
            <div className="bento-card">
              <h3>Open Bar Inteligente</h3>
              <p>Escolha suas bebidas antecipadamente e aproveite o melhor da festa.</p>
            </div>
            <div className="bento-card" style={{ gridColumn: 'span 2', background: 'var(--bg-subtle)' }}>
              <h3>Segurança e Conforto</h3>
              <p>Sistema robusto de inscrições e controle de acesso para garantir que sua única preocupação seja se divertir.</p>
            </div>
          </div>
        </section>

        {/* User's Upcoming Events — Shortcut for logged in users */}
        {user && myRegistrations.length > 0 && (
          <section className="section" style={{ padding: '80px 0 40px' }}>
            <div className="container">
              <div className="row between" style={{ marginBottom: '32px', alignItems: 'flex-end' }}>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em' }}>Seus Próximos <span className="gradient-text">Eventos</span></h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Tudo pronto para suas próximas experiências.</p>
                </div>
                <Link to="/my-registrations" className="btn secondary small">Ver todas as inscrições</Link>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {myRegistrations.slice(0, 3).map((reg) => (
                  <Link to={`/e/${reg.events.slug}`} key={reg.id} className="card">
                    <div className="card-content">
                      <div className="status-badge published" style={{ alignSelf: 'flex-start' }}>Inscrito</div>
                      <h3 className="card-title" style={{ fontSize: '18px' }}>{reg.events.title}</h3>
                      <div className="card-meta">
                        <span>Data: {new Date(reg.events.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                        <span>•</span>
                        <span>Local: {reg.events.location}</span>
                      </div>
                      <div className="card-footer" style={{ borderTop: 'none', padding: 0 }}>
                        <button className="btn secondary small full-width">Ver Detalhes</button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it works — Hidden for logged in users to avoid repetition */}
        {!user && (
          <section
            id="como-funciona"
            className="section"
            style={{ 
              background: 'linear-gradient(180deg, transparent 0%, var(--bg-subtle) 50%, transparent 100%)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)' 
            }}
            ref={(el) => (sectionsRef.current[0] = el)}
          >
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                <h2 className="section-title">Simples e elegante.</h2>
                <p className="section-subtitle" style={{ margin: '12px auto 0' }}>
                  Três passos para garantir sua presença no melhor evento.
                </p>
              </div>
              
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
                <div className="bento-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'var(--primary)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 24px', 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#fff',
                    boxShadow: '0 8px 16px var(--primary-glow)'
                  }}>1</div>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Explore</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Descubra eventos exclusivos e escolha sua próxima experiência.</p>
                </div>
                <div className="bento-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'var(--primary)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 24px', 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#fff',
                    boxShadow: '0 8px 16px var(--primary-glow)'
                  }}>2</div>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Garanta</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Selecione suas preferências e confirme sua presença em segundos.</p>
                </div>
                <div className="bento-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'var(--primary)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 24px', 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#fff',
                    boxShadow: '0 8px 16px var(--primary-glow)'
                  }}>3</div>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Aproveite</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Receba seu QR Code e curta a festa sem se preocupar com filas.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Events Section */}
        <section
          id="eventos"
          className="section"
          ref={(el) => (sectionsRef.current[1] = el)}
        >
          <div className="container">
            <h2 className="section-title">{user ? 'Descobrir Novas Festas' : 'Próximos Eventos'}</h2>
            <p className="section-subtitle">
              {user ? 'Explore outros eventos que estão por vir e não fique de fora.' : 'Escolha sua próxima experiência e garanta seu lugar.'}
            </p>

            {error && (
              <div style={{
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--error-bg)',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                fontSize: '15px',
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            <div className="grid" id="eventos">
              {upcoming.length > 0 ? (
                upcoming.map((e) => (
                  <Link key={e.id} to={`/e/${e.slug}`} className="card">
                    <div className="card-image-wrapper">
                      <img 
                        src={e.cover_image_url || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop`} 
                        alt={e.title}
                        className="card-image"
                      />
                      <div className="card-badge">Novo</div>
                    </div>
                    <div className="card-content">
                      <div className="card-meta">
                        <span>Data: {new Date(e.date_time).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span>Local: {e.location}</span>
                      </div>
                      <h3 className="card-title">{e.title}</h3>
                      <p className="card-description">
                        {e.description || "Nenhuma descrição fornecida."}
                      </p>
                      <div className="card-footer">
                        <button className="btn primary small full-width" style={{ borderRadius: '12px' }}>Garantir meu lugar</button>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <h3>Nenhum evento futuro</h3>
                  <p>Fique de olho! Novas festas serão publicadas em breve.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!user && (
          <section
            className="section cta-section"
            ref={(el) => (sectionsRef.current[2] = el)}
          >
            <div className="container">
              <h2>Pronto para se inscrever?</h2>
              <p>Escolha um evento acima e comece agora mesmo!</p>
              <a href="#eventos" className="btn primary-glow large">
                Explorar Eventos
              </a>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
