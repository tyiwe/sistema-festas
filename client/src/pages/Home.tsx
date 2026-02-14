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
      .then(res => {
        console.log("Stats carregadas:", res);
        // Fallback: se o backend retornar 0 mas tivermos eventos carregados, usamos o count local
        setStats({
          eventCount: res.eventCount || events.length || 0,
          registrationCount: res.registrationCount || 0
        });
      })
      .catch(err => {
        console.error("Erro ao carregar stats:", err);
        // Fallback em caso de erro
        setStats(prev => ({ ...prev, eventCount: events.length }));
      });

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
            <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '100px', fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '32px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              {user ? `👋 E aí, ${user.full_name.split(' ')[0]}!` : '✨ Onde os melhores rolês se encontram'}
            </div>
            <h1 className="hero-title" style={{ fontSize: 'clamp(32px, 8vw, 72px)', lineHeight: 1.1, letterSpacing: '-0.05em', padding: '0 16px' }}>
              {user ? (
                <>Pronto para o seu<br /><span className="gradient-text">próximo rolê?</span></>
              ) : (
                <>O rolê que você quer,<br /><span className="gradient-text">no lugar que você confia.</span></>
              )}
            </h1>
            <p className="hero-subtitle" style={{ maxWidth: '600px', margin: '24px auto 40px', fontSize: 'clamp(16px, 3vw, 20px)', color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 24px' }}>
              {user ? (
                "Sua lista de eventos está atualizada. Dá uma olhada no que tem de novo ou acesse seus ingressos garantidos."
              ) : (
                "Chega de perder tempo procurando. Encontre as festas mais exclusivas, garanta seu lugar em segundos e entre sem fila. O resto é com você."
              )}
            </p>
            <div className="hero-btns" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', padding: '0 16px' }}>
              <button 
                onClick={() => document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn primary large"
                style={{ padding: '14px 28px', fontSize: '15px', minWidth: '160px' }}
              >
                Ver Próximas Festas
              </button>
              {user ? (
                <Link to="/my-registrations" className="btn secondary large" style={{ padding: '14px 28px', fontSize: '15px', minWidth: '160px' }}>
                  Meus Ingressos
                </Link>
              ) : (
                <Link to="/user-auth" className="btn secondary large" style={{ padding: '14px 28px', fontSize: '15px', minWidth: '160px' }}>
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
              <div className="hero-preview" style={{ 
          background: 'var(--bg)', 
          borderRadius: '24px', 
          minHeight: 'clamp(350px, 60vh, 450px)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginTop: '60px',
          width: '100%'
        }}>
                <div style={{ textAlign: 'center', zIndex: 2, width: '100%' }}>
                  <div className="stats-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px' }}>
                    <div className="stack tight">
                      <span style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {stats.eventCount > 0 ? `+${stats.eventCount}` : stats.eventCount}
                      </span>
                      <span className="muted small uppercase" style={{ letterSpacing: '0.1em', fontWeight: 600, fontSize: 'clamp(10px, 2vw, 12px)' }}>Festas Confirmadas</span>
                    </div>
                    <div className="stats-divider" style={{ width: '1px', height: '60px', background: 'var(--border)' }} />
                    <div className="stack tight">
                      <span style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {stats.registrationCount >= 1000 ? `${(stats.registrationCount / 1000).toFixed(1)}k` : (stats.registrationCount || 0)}
                      </span>
                      <span className="muted small uppercase" style={{ letterSpacing: '0.1em', fontWeight: 600, fontSize: 'clamp(10px, 2vw, 12px)' }}>Pessoas na Lista</span>
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
          <div className="bento-grid stagger-3" style={{ marginTop: '80px' }}>
            <div className="bento-card" style={{ gridColumn: 'span 2', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3>Só o que é Top</h3>
              <p>A gente faz a curadoria de verdade. Só as festas que realmente valem a pena, pra você não cair em furada.</p>
            </div>
            <div className="bento-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3>Entrou, Curtiu</h3>
              <p>Nada de filas quilométricas. Mostrou o QR Code no celular, entrou. Simples assim.</p>
            </div>
            <div className="bento-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3>Seu Copo Cheio</h3>
              <p>Garanta seu consumo antes mesmo de sair de casa e foque no que importa: a diversão.</p>
            </div>
            <div className="bento-card" style={{ gridColumn: 'span 2', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3>Zero Estresse</h3>
              <p>Tudo seguro, organizado e direto ao ponto. Sua única missão é aproveitar a noite até o fim.</p>
            </div>
          </div>
        </section>

        {/* User's Upcoming Events — Shortcut for logged in users */}
        {user && myRegistrations.length > 0 && (
          <section className="section" style={{ padding: '80px 0 40px' }}>
            <div className="container">
              <div className="row between" style={{ marginBottom: '32px', alignItems: 'flex-end' }}>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em' }}>Seus Próximos <span className="gradient-text">Rolês</span></h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Tá tudo certo pra você curtir as próximas festas.</p>
                </div>
                <Link to="/my-registrations" className="btn secondary small">Ver todos os ingressos</Link>
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
                        <button className="btn secondary small full-width">Ver o que vai ter</button>
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
                <h2 className="section-title">Sem complicação.</h2>
                <p className="section-subtitle" style={{ margin: '12px auto 0' }}>
                  Em 3 passos você já está na lista.
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
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Escolha o Rolê</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Veja o que tá rolando e escolha onde quer estar.</p>
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
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Garanta a Vaga</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Preencha seus dados rapidinho e confirme sua presença em segundos.</p>
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
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Só Aparecer</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Seu QR Code chega na hora. Mostrou na porta, entrou. Sem estresse.</p>
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
            <h2 className="section-title">{user ? 'O que vem por aí' : 'Próximas Festas'}</h2>
            <p className="section-subtitle">
              {user ? 'Dá uma olhada no que mais tá rolando pra você não ficar de fora.' : 'Escolhe seu próximo destino e garante seu lugar.'}
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
              <h2>Bora pro próximo rolê?</h2>
              <p>Não fica de fora. Escolhe sua festa e garante seu lugar agora.</p>
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
