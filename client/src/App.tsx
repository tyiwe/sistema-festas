import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiGet } from "./api";
import Home from "./pages/Home";
import EventPublic from "./pages/EventPublic";
import UserAuth from "./pages/UserAuth";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventForm from "./pages/admin/AdminEventForm";
import AdminEventOptions from "./pages/admin/AdminEventOptions";
import AdminEventStats from "./pages/admin/AdminEventStats";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ authenticated: boolean; is_admin: boolean }>({
    authenticated: false,
    is_admin: false
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        if (meRes.authenticated) {
          const profileRes = await apiGet<{ user: { is_admin: boolean } }>("/user/profile");
          setUser({
            authenticated: true,
            is_admin: !!profileRes.user?.is_admin
          });
        } else {
          setUser({ authenticated: false, is_admin: false });
        }
      } catch {
        setUser({ authenticated: false, is_admin: false });
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Protege rotas que exigem login (qualquer usuário)
  function PrivateRoute({ element }: { element: JSX.Element }) {
    if (loading) return <div className="container"><div className="card muted">Carregando…</div></div>;
    return user.authenticated ? element : <Navigate to="/user-auth" replace />;
  }

  // Protege rotas que exigem ser Admin
  function AdminRoute({ element }: { element: JSX.Element }) {
    if (loading) return <div className="container"><div className="card muted">Carregando…</div></div>;
    if (!user.authenticated) return <Navigate to="/user-auth" replace />;
    return user.is_admin ? element : <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/e/:slug" element={<EventPublic />} />
      <Route path="/user-auth" element={<UserAuth />} />

      {/* Rotas de Usuário Logado */}
      <Route path="/profile" element={<PrivateRoute element={<Profile />} />} />

      {/* Rotas Administrativas */}
      <Route path="/admin" element={<AdminRoute element={<AdminDashboard />} />} />
      <Route path="/admin/new" element={<AdminRoute element={<AdminEventForm />} />} />
      <Route path="/admin/edit/:id" element={<AdminRoute element={<AdminEventForm />} />} />
      <Route path="/admin/events/:id/options" element={<AdminRoute element={<AdminEventOptions />} />} />
      <Route path="/admin/events/:id/stats" element={<AdminRoute element={<AdminEventStats />} />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
