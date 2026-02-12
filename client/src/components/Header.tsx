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
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <Link className="brand" to="/">{title || "Festas"}</Link>
        <nav className="nav" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {!showLogout && <Link to="/">Eventos</Link>}
          
          {!loadingAuth && userLoggedIn && (
            <>
              <Link to="/my-registrations" style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8 }}>
                Minhas Inscrições
              </Link>
              {isAdmin && (
                <Link to="/admin" className="btn secondary small" style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: '#5856d6', color: 'white' }}>
                  Painel Admin
                </Link>
              )}
              <button
                className="btn ghost small"
                onClick={handleLogout}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Sair
              </button>
            </>
          )}

          {!loadingAuth && !userLoggedIn && !showLogout && (
            <Link to="/user-auth" className="btn primary small" style={{ padding: '8px 16px', fontSize: '12px' }}>
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
