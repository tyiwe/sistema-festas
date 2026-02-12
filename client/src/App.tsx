import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiGet } from "./api";
import Home from "./pages/Home";
import EventPublic from "./pages/EventPublic";
import UserAuth from "./pages/UserAuth";
import MyRegistrations from "./pages/MyRegistrations";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventForm from "./pages/admin/AdminEventForm";
import AdminEventOptions from "./pages/admin/AdminEventOptions";
import AdminEventStats from "./pages/admin/AdminEventStats";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const meRes = await apiGet<{ authenticated: boolean }>("/user/me");
        if (meRes.authenticated) {
          const profileRes = await apiGet<{ user: any }>("/user/profile");
          setAuthed(profileRes.user?.is_admin === true);
        } else {
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      }
    }
    checkAuth();
  }, []);

  function requireAuth(element: JSX.Element) {
    if (authed === null) return <div className="container"><div className="card muted">Carregando…</div></div>;
    return authed ? element : <Navigate to="/user-auth" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/e/:slug" element={<EventPublic />} />
      <Route path="/user-auth" element={<UserAuth />} />
      <Route path="/my-registrations" element={<MyRegistrations />} />

      {/* Rota de login antigo removida - use /user-auth */}

      <Route path="/admin" element={requireAuth(<AdminDashboard />)} />
      <Route path="/admin/new" element={requireAuth(<AdminEventForm />)} />
      <Route path="/admin/edit/:id" element={requireAuth(<AdminEventForm />)} />

      <Route path="/admin/events/:id/options" element={requireAuth(<AdminEventOptions />)} />
      <Route path="/admin/events/:id/stats" element={requireAuth(<AdminEventStats />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
