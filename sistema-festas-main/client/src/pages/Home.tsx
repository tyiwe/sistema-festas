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
  const [error, setError] = useState<string | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    apiGet<{ events: EventRow[] }>("/public/events")
      .then((r) => setEvents(r.events))
      .catch((e) => setError(String(e?.message ?? e)));
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
        return Number.isNaN(t) ? true : t >= now - 24 * 60 * 60 * 1000;
      });
  }, [events]);

  return (
    <>
      <Header />

      <main>
        {/* Hero Section — Dark immersive */}
        <section className="hero-section">
          <h1 className="hero-title">
            Sua próxima festa
            <br />
            <span className="hero-title-gradient">começa aqui.</span>
          </h1>
          <p className="hero-subtitle">
            Inscreva-se nos melhores eventos. Escolha suas bebidas favoritas. Tudo em um só lugar.
          </p>
          <div className="hero-cta">
            <a href="#eventos" className="btn primary-glow large">Explorar Eventos</a>
            <a href="#como-funciona" className="btn hero-btn large">Como funciona</a>
          </div>
          <div className="hero-scroll-hint">
            <span />
          </div>
        </section>

        {/* How it works */}
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
                <h3>Confirme</h3>
                <p>Finalize sua inscrição e aproveite o evento!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section
          id="eventos"
          className="section"
          ref={(el) => (sectionsRef.current[1] = el)}
        >
          <div className="container">
            <h2 className="section-title">Próximos Eventos</h2>
            <p className="section-subtitle">Confira as festas que estão por vir.</p>

            {error && (
              <div style={{
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 59, 48, 0.06)',
                border: '1px solid rgba(255, 59, 48, 0.15)',
                color: '#ff3b30',
                fontSize: '15px',
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 24px' }}>
                <div className="empty-state-icon">🎉</div>
                <h3>Nenhum evento no momento</h3>
                <p>Volte em breve para conferir novos eventos!</p>
              </div>
            ) : (
              <div className="events-grid">
                {upcoming.map((event) => (
                  <Link
                    key={event.id}
                    to={`/e/${event.slug}`}
                    className="event-card"
                  >
                    {event.cover_image_url && (
                      <div className="event-card-image">
                        <img src={event.cover_image_url} alt={event.title} />
                      </div>
                    )}
                    <div className="event-card-content">
                      <h3>{event.title}</h3>
                      <p className="event-card-meta">
                        {new Date(event.date_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <p className="event-card-location">{event.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
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
      </main>
    </>
  );
}
