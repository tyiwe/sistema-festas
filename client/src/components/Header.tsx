import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { useEffect, useState } from "react";

interface HeaderProps {
  showLogout?: boolean;
  title?: string;
}

export default function Header({ showLogout = false, title }: HeaderProps) {
  const navigate = useNavigate();
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fecha o menu ao mudar de rota
    setIsMenuOpen(false);

    async function checkAuth() {
      try {
        // Primeiro verificamos se o usuário está autenticado
        const meRes = await apiGet<{ authenticated: boolean, userId?: string }>("/user/me");
        if (meRes.authenticated) {
          setUserLoggedIn(true);
          
          // Se for o admin especial pelo código, já definimos como admin
          if (meRes.userId === "admin") {
            setIsAdmin(true);
          } else {
            // Se autenticado via login normal, buscamos o perfil para ver se é admin no banco
            const profileRes = await apiGet<{ user: { is_admin: boolean } }>("/user/profile");
            setIsAdmin(!!profileRes.user?.is_admin);
          }
        } else {
          setUserLoggedIn(false);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Erro na verificação de autenticação:", err);
        setUserLoggedIn(false);
        setIsAdmin(false);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, [navigate]);

  async function handleLogout() {
    try {
      // Tenta deslogar em ambos os endpoints por segurança
      await Promise.allSettled([
        apiPost("/user/logout", {}),
        apiPost("/auth/logout", {})
      ]);
    } catch (err) {
      console.error("Erro ao fazer logout no servidor:", err);
    } finally {
      // Limpa estados locais e redireciona SEMPRE, mesmo se a rede falhar
      setUserLoggedIn(false);
      setIsAdmin(false);
      
      // Limpeza manual de cookies (fallback)
      document.cookie = "sf_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      
      navigate("/");
      // Força recarregamento para garantir que todos os estados de todos os componentes sejam resetados
      window.location.href = "/";
    }
  }

  return (
    <>
      <header className={`topbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <Link 
            className="brand" 
            to="/"
          >
            {title || "Festas"}
          </Link>

          <nav className="nav desktop-only">
            {!showLogout && <Link to="/" className="nav-link">Início</Link>}
            
            {!loadingAuth && userLoggedIn && (
              <>
                <Link to="/profile" className="nav-link">Perfil</Link>
                {isAdmin && (
                  <Link to="/admin" className="nav-link">Admin</Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="nav-link logout-btn"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sair
                </button>
              </>
            )}

            {!loadingAuth && !userLoggedIn && !showLogout && (
              <Link to="/user-auth" className="nav-link-cta">Entrar</Link>
            )}
          </nav>

          <button 
            className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <nav className="mobile-nav">
            {!showLogout && (
              <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                Início
              </Link>
            )}
            
            {!loadingAuth && userLoggedIn && (
              <>
                <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                  Perfil
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Painel Admin
                  </Link>
                )}
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="mobile-nav-link logout"
                >
                  Sair
                </button>
              </>
            )}

            {!loadingAuth && !userLoggedIn && !showLogout && (
              <Link to="/user-auth" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                Entrar / Cadastrar
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
