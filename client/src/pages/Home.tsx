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
        {/* Hero Section — Dynamic content based on login */}
        <section className="hero-section">
          {user ? (
            <div className="fade-in">
              <h1 className="hero-title" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)' }}>
                Olá, <span className="gradient-text">{user.full_name.split(' ')[0]}</span>!
                <br />
                Pronto para a próxima?
              </h1>
              <p className="hero-subtitle">
                Confira os eventos disponíveis e garanta sua vaga. Suas bebidas favoritas te esperam.
              </p>
              <div className="hero-cta">
                <a href="#eventos" className="btn primary-glow large">Explorar Eventos</a>
                <Link to="/my-registrations" className="btn secondary large">Minhas Inscrições</Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="hero-title">
                Sua próxima festa
                <br />
                <span className="gradient-text">começa aqui.</span>
              </h1>
              <p className="hero-subtitle">
                Inscreva-se nos melhores eventos. Escolha suas bebidas favoritas. Tudo em um só lugar.
              </p>
              <div className="hero-cta">
                <a href="#eventos" className="btn primary-glow large">Explorar Eventos</a>
                <Link to="/user-auth" className="btn secondary large">Criar Conta</Link>
              </div>
            </>
          )}
          <div className="hero-scroll-hint">
            <span />
          </div>
        </section>

        {/* User's Upcoming Events — Shortcut for logged in users */}
        {user && myRegistrations.length > 0 && (
          <section className="section" style={{ padding: '60px 0 20px' }}>
            <div className="container">
              <div className="row between" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Seus Próximos <span className="gradient-text">Eventos</span></h2>
                <Link to="/my-registrations" className="btn ghost small">Ver todas as inscrições</Link>
              </div>
              <div className="grid cols-3" style={{ gap: '16px' }}>
                {myRegistrations.slice(0, 3).map((reg) => (
                  <Link to={`/event/${reg.events.slug}`} key={reg.id} className="admin-event-row" style={{ textDecoration: 'none', color: 'inherit', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="status-badge published" style={{ alignSelf: 'flex-start', fontSize: '10px' }}>Inscrito</div>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>{reg.events.title}</h3>
                    <div className="muted small">
                      {new Date(reg.events.date_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {reg.events.location}
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
            ref={(el) => (sectionsRef.current[0] = el)}
          >
            <div className="container">
              <h2 className="section-title">Simples e elegante.</h2>
              <p className="section-subtitle">
                Três passos para garantir sua presença no evento.
              </p>
              <div className="features-grid">
                <div className="feature-card">
                  <span className="feature-icon">1</span>
                  <h3>Explore</h3>
                  <p>Veja os eventos disponíveis e escolha qual você quer participar.</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">2</span>
                  <h3>Escolha</h3>
                  <p>Selecione suas bebidas favoritas e adicione observações especiais.</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">3</span>
                  <h3>Aproveite</h3>
                  <p>Pronto! Sua presença está confirmada. Agora é só curtir a festa.</p>
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
                    </div>
                    <div className="card-content">
                      <div className="row between" style={{ marginBottom: '8px' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>{e.title}</h3>
                        <div style={{ background: 'var(--primary-glow)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Novo</div>
                      </div>
                      <div className="card-meta">
                        <span>{new Date(e.date_time).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span>{e.location}</span>
                      </div>
                      <p className="card-description">
                        {e.description || "Nenhuma descrição fornecida."}
                      </p>
                      <div className="card-footer">
                        <span className="btn secondary small full-width">Ver Detalhes</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
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
