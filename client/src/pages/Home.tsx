import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import Header from "../components/Header";

export default function Home() {
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    apiGet<{ authenticated: boolean }>("/user/me")
      .then((res) => setIsAuth(!!res.authenticated))
      .catch(() => setIsAuth(false));
  }, []);

  return (
    <>
      <Header />

      <main className="fade-in">
        <section className="hero-section">
          <div className="container hero-container">
            <div className="hero-content">
              <p className="hero-badge">Comece sua festa do jeito certo</p>
              <h1 className="hero-title">
                Crie a página da sua festa, manda o link no grupo e controla tudo em um lugar só.
              </h1>
              <p className="hero-subtitle">
                Você cria sua conta, monta a festa em poucos minutos e compartilha um link único com os convidados. Nada de textão perdido no WhatsApp.
              </p>

              <div className="hero-cta">
                {isAuth ? (
                  <Link to="/admin" className="btn primary-glow large">
                    Ir para meu painel
                  </Link>
                ) : (
                  <Link to="/user-auth" className="btn primary-glow large">
                    Criar minha conta de organizador
                  </Link>
                )}
                <button
                  className="btn hero-btn large"
                  onClick={() => {
                    const el = document.getElementById("tutorial-criar-festa");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Ver passo a passo
                </button>
              </div>

              <div className="hero-meta">
                <span>Sem painel complicado</span>
                <span>Focado em festas entre amigos</span>
                <span>Funciona bem no celular</span>
              </div>
              {isAuth && (
                <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
                  Depois de criar a festa, você encontra tudo em <strong>Admin &gt; Seus eventos</strong>, com o botão para copiar o link e mandar no grupo.
                </p>
              )}
            </div>

            <div className="hero-preview">
              <div className="hero-card primary">
                <h2>Antes: tudo espalhado</h2>
                <p>
                  Endereço num print, lista de compras no bloco de notas, confirmação de presença em cima da hora. Difícil ter noção real de quem vai e do que precisa comprar.
                </p>
              </div>

              <div className="hero-card secondary">
                <h2>Depois: uma página que resolve</h2>
                <p>
                  Link único com capa, descrição, data, local, confirmação de presença e preferências de bebida. Você enxerga o rolê inteiro num painel organizado.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="tutorial-criar-festa" className="section">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2 className="section-title">Como criar sua festa aqui dentro</h2>
              <p className="section-subtitle">
                Um passo a passo bem direto pra você sair dessa tela com um evento pronto pra mandar no grupo.
              </p>
            </div>

            <div className="bento-grid">
              <div className="bento-card">
                <h3>1. Crie sua conta de organizador</h3>
                <p>
                  Clique em “Criar minha conta” e cadastre seu nome, e-mail e senha. Com uma conta você controla todas as festas que criar.
                </p>
              </div>

              <div className="bento-card">
                <h3>2. Acesse o painel e clique em “Nova Festa”</h3>
                <p>
                  No painel, você encontra o botão para criar um novo evento. É ali que começa a mágica: título, data, horário e local.
                </p>
              </div>

              <div className="bento-card">
                <h3>3. Monte a página da sua festa</h3>
                <p>
                  Adicione capa, descrição com o clima do rolê e os detalhes que ninguém pode esquecer. A página fica com cara de evento de verdade.
                </p>
              </div>

              <div className="bento-card">
                <h3>4. Configure bebidas e opções</h3>
                <p>
                  Cadastre as opções de bebida e comida. Na hora de se inscrever, cada convidado marca o que pretende consumir e você já vê o resumo no painel.
                </p>
              </div>

              <div className="bento-card">
                <h3>5. Publique e copie o link</h3>
                <p>
                  Quando estiver tudo pronto, publique o evento e copie o link da página. É esse link que você vai mandar no grupo da galera.
                </p>
              </div>

              <div className="bento-card">
                <h3>6. Acompanhe confirmações e se organize</h3>
                <p>
                  Veja quem confirmou, contatos, alergias e preferências. Use os números pra fazer a lista de compras sem chute e sem stress.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <h2 className="section-title">Feito pra quem puxa o rolê</h2>
              <p className="section-subtitle">
                Se você é a pessoa que organiza tudo – lista, vaquinha, endereço, som, bebida – esse sistema foi criado pra te ajudar a não surtar.
              </p>
            </div>

            <div className="grid">
              <div className="card">
                <div className="card-content">
                  <h3>Menos perguntas repetidas</h3>
                  <p>
                    Em vez de responder “que horas começa?”, “onde é mesmo?” e “o que levar?” vinte vezes, você manda o link e a pessoa se resolve ali.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <h3>Controle melhor dos gastos</h3>
                  <p>
                    Com as preferências de bebida da galera, você monta uma lista de compras com bem menos achismo e bem mais precisão.
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <h3>Rolê com cara de evento</h3>
                  <p>
                    Uma página bonita, com tudo organizado, passa a sensação de que a festa foi pensada com carinho. A galera leva mais a sério.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <Link to="/user-auth" className="btn primary-glow large">
                Criar minha conta e montar a primeira festa
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
