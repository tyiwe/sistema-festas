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

  useEffect(() => {
    async function checkAuth() {
      try {
        // Primeiro verificamos se o usuário está autenticado
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        if (meRes.authenticated) {
          setUserLoggedIn(true);
          // Se autenticado, buscamos o perfil completo para ver se é admin
          const profileRes = await apiGet<{ user: { is_admin: boolean } }>("/user/profile");
          setIsAdmin(!!profileRes.user?.is_admin);
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
  }, []);

  async function handleLogout() {
    try {
      await apiPost("/user/logout", {});
      // Limpa estados locais antes de navegar
      setUserLoggedIn(false);
      setIsAdmin(false);
      navigate("/");
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao fazer logout:", err);
    }
  }

  return (
    <header className="topbar">
      <div className="container header-container">
        <Link className="brand" to="/">
          {title || "Sistema de Festas"}
        </Link>
        <nav className="nav">
          {!showLogout && <Link to="/" className="nav-link">Eventos</Link>}
          
          {!loadingAuth && userLoggedIn && (
            <>
              <Link to="/profile" className="nav-link">
                Perfil
              </Link>
              <Link to="/my-registrations" className="nav-link">
                Inscrições
              </Link>
              {isAdmin && (
                <Link to="/admin" className="btn primary-glow small">
                  Admin
                </Link>
              )}
              <button
                className="btn small secondary"
                onClick={handleLogout}
              >
                Sair
              </button>
            </>
          )}

          {!loadingAuth && !userLoggedIn && !showLogout && (
            <Link to="/user-auth" className="btn primary small">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
