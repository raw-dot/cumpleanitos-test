import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { COLORS, Logo, Button, Avatar, getInitials, ROLES } from "./shared";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import AuthPage from "./pages/AuthPage";
import AdminShell from "./admin/AdminShell";
import CelebrantDashboard from "./pages/CelebrantDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ExplorePage from "./pages/ExplorePage";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import WishListPage from "./pages/WishListPage";
import GiftsGivenPage from "./pages/GiftsGivenPage";
import ManageGiftsPage from "./pages/ManageGiftsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ShareProfilePage from "./pages/ShareProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MPOAuthCallbackPage from "./pages/MPOAuthCallbackPage";
import MPPaymentResultPage from "./pages/MPPaymentResultPage";
import OrganizeBirthdayPage from "./pages/OrganizeBirthdayPage";
import InviteLandingPage from "./pages/InviteLandingPage";
import AppLayout from "./pages/NewUI/AppLayout";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ page, navigate, session, profile, onLogout, onRoleSwitch, onViewLanding }) {
  const [showMenu, setShowMenu] = useState(false);
  const isMobile = useIsMobile();
  const role = profile?.role;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/u/" + profile?.username);
    setShowMenu(false);
  };

  const menuItems = [
    { icon: "🎂", label: "Mi regalo", action: () => { navigate("dashboard"); setShowMenu(false); } },
    { icon: "⚙️", label: "Configuración", action: () => { navigate("settings-mobile"); setShowMenu(false); } },
    { icon: "🔗", label: "Compartir mi perfil", action: () => { navigate("share"); setShowMenu(false); } },
    ...(profile?.is_admin ? [{ icon: "🛡️", label: "Panel Admin", action: () => { navigate("admin"); setShowMenu(false); }, color: "#92400E" }] : []),
    { icon: "🚪", label: "Cerrar sesión", action: () => { onLogout(); setShowMenu(false); }, color: COLORS.error },
  ];

  return (
    <nav style={{
      background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid " + COLORS.border,
      padding: "12px 0", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "0 16px" : "0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div onClick={() => navigate("landing")} style={{ cursor: "pointer", flexShrink: 0 }}>
          <Logo size={isMobile ? 20 : 24} />
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Button variant={page === "explore" ? "outline" : "ghost"} size="sm" onClick={() => navigate("explore")}>Explorar</Button>
            {session ? (
              <>
                {role === "manager" ? (
                  <Button variant="ghost" size="sm" onClick={() => navigate("dashboard")}>🎁 Mis regalos</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={onViewLanding}>🎂 Mi cumple</Button>
                )}
                <div style={{ position: "relative", marginLeft: 4, display: "flex", alignItems: "center", gap: 2 }}>
                  <div onClick={() => { navigate("settings"); setShowMenu(false); }}
                    style={{ cursor: "pointer", borderRadius: "50%", border: "2px solid transparent", transition: "border 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.border = "2px solid " + COLORS.primary}
                    onMouseLeave={e => e.currentTarget.style.border = "2px solid transparent"}>
                    <Avatar initials={profile ? getInitials(profile.name) : "?"} src={profile?.avatar_url} size={36} />
                  </div>
                  <button onClick={() => setShowMenu(v => !v)} style={{
                    background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                    color: COLORS.textLight, fontSize: 14, lineHeight: 1, borderRadius: 4, fontWeight: 700,
                  }}>▾</button>
                  {showMenu && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setShowMenu(false)} />
                      <div style={{
                        position: "absolute", right: 0, top: "calc(100% + 10px)",
                        background: "#fff", borderRadius: 16, border: "1px solid " + COLORS.border,
                        boxShadow: "0 10px 40px rgba(0,0,0,0.14)", minWidth: 230, zIndex: 200, overflow: "hidden",
                      }}>
                        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar initials={profile ? getInitials(profile.name) : "?"} src={profile?.avatar_url} size={38} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{profile?.name}</div>
                            <div style={{ fontSize: 12, color: COLORS.textLight }}>@{profile?.username}</div>
                          </div>
                        </div>

                        {menuItems.map((item, i) => (
                          <button key={i} onClick={item.action} style={{
                            display: "flex", alignItems: "center", gap: 12, width: "100%",
                            padding: "13px 18px", border: "none",
                            borderBottom: i < menuItems.length - 1 ? "1px solid " + COLORS.border : "none",
                            background: "none", cursor: "pointer", fontSize: 14,
                            color: item.color || COLORS.text, textAlign: "left", fontWeight: 500,
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = COLORS.bg}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}>
                            <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("login")}>Iniciar sesión</Button>
                <Button variant="accent" size="sm" onClick={() => navigate("register")}>Registrarse gratis</Button>
              </>
            )}
          </div>
        )}

        {isMobile && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {session ? (
              <div onClick={() => navigate("perfil")} style={{ cursor: "pointer" }}>
                <Avatar initials={profile ? getInitials(profile.name) : "?"} src={profile?.avatar_url} size={34} />
              </div>
            ) : (
              <>
                <button onClick={() => navigate("login")} style={{
                  background: "transparent", border: "1.5px solid " + COLORS.primary,
                  color: COLORS.primary, borderRadius: 9999,
                  padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>Ingresar</button>
                <button onClick={() => navigate("register")} style={{
                  background: COLORS.accent, border: "none", color: "#fff", borderRadius: 9999,
                  padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
                }}>Registrarse</button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── PANTALLA PERFIL MOBILE ────────────────────────────────────────────────
function ProfileScreen({ profile, navigate, onLogout, onViewLanding, stats, onAvatarUpload, onCoverUpload }) {
  const role = profile?.role;

  const spaceCards = [
    { icon: "🎂", title: "Regalo", color: COLORS.primary, bg: "#F5F0FF", action: () => onViewLanding() },
    { icon: "📋", title: "Deseos", color: COLORS.accent, bg: "#FFFBEB", action: () => navigate("wishlist") },
    { icon: "🎁", title: "Regalé", color: "#10B981", bg: "#F0FDF9", action: () => navigate("gifts-given") },
    { icon: "🛍️", title: "Gestionar", color: "#3B82F6", bg: "#EFF6FF", action: () => navigate("manage-gifts") },
  ];

  const accountItems = [
    { icon: "⚙️", label: "Configuración", sub: "Editar perfil y datos", bg: "#F3F4F6", action: () => navigate("settings-mobile") },
    { icon: "🔗", label: "Compartir mi perfil", sub: "Link de cumpleaños público", bg: "#F3F4F6", action: () => navigate("share") },
    ...(profile?.is_admin ? [{ icon: "🛡️", label: "Panel Admin", sub: "Gestión de usuarios", bg: "#FEF3C7", action: () => navigate("admin") }] : []),
    { icon: "🚪", label: "Cerrar sesión", sub: null, bg: "#FEF2F2", danger: true, action: onLogout },
  ];

  return (
    <div style={{ background: "#F5F5F7", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Portada — banner ancho y proporcional */}
      <div style={{ position: "relative" }}>
        <div style={{
          height: 160,
          background: profile?.cover_url
            ? "url(" + profile.cover_url + ") " + (profile.cover_position || "center") + "/cover no-repeat"
            : profile?.cover_gradient
            ? profile.cover_gradient
            : "linear-gradient(135deg, #7C3AED 0%, #9C27B0 40%, #F59E0B 100%)",
          width: "100%",
        }}>
          <label htmlFor="cover-upload" style={{
            position: "absolute", bottom: 10, right: 12,
            background: "rgba(0,0,0,0.50)", color: "#fff",
            borderRadius: 20, padding: "5px 12px",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            backdropFilter: "blur(4px)",
          }}>
            ✏️ Portada
          </label>
          <input id="cover-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={onCoverUpload} />
        </div>

        {/* Avatar centrado, mitad sobre la portada */}
        <div style={{ position: "absolute", bottom: -44, left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ position: "relative" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{
                  width: 88, height: 88, borderRadius: "50%",
                  objectFit: "cover", border: "4px solid #fff",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.18)", display: "block",
                }} />
              : <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                  color: "#fff", fontSize: 32, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "4px solid #fff", boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                }}>{profile ? getInitials(profile.name) : "?"}</div>
            }
            <label htmlFor="avatar-upload" style={{
              position: "absolute", bottom: 2, right: 2,
              width: 26, height: 26, borderRadius: "50%",
              background: COLORS.primary, color: "#fff",
              fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
              border: "2.5px solid #fff", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(124,58,237,0.4)",
            }}>✏️</label>
            <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={onAvatarUpload} />
          </div>
        </div>
      </div>

      {/* Nombre + username — espacio para el avatar que sobresale */}
      <div style={{ background: "#F5F5F7", paddingTop: 54, paddingBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: COLORS.text, letterSpacing: -0.5 }}>{profile?.name}</div>
        <div style={{ fontSize: 13, color: COLORS.textLight, marginTop: 3 }}>@{profile?.username}</div>
      </div>

      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid " + COLORS.border }}>
        {[
          { n: (() => {
            const r = stats.raised;
            if (r <= 0) return "$0";
            if (r >= 1000000) return "$" + (r/1000000).toFixed(r % 1000000 === 0 ? 0 : 1) + "M";
            if (r >= 1000) return "$" + Math.round(r/1000) + "k";
            return "$" + Math.round(r).toLocaleString("es-AR");
          })(), l: "Recaudado" },
          { n: stats.giftsGiven || 0, l: "Regalé" },
          { n: stats.gifters, l: "Recibidos" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 4px", textAlign: "center", borderRight: i < 2 ? "1px solid " + COLORS.border : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{s.n}</div>
            <div style={{ fontSize: 10, color: COLORS.textLight }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 14px 4px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Mi espacio</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {spaceCards.map((card, i) => (
            <button key={i} onClick={card.action} style={{
              background: "#fff", borderRadius: 16, padding: "16px 10px 14px",
              border: "1px solid " + COLORS.border,
              borderBottom: "3px solid " + card.color,
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center",
              minHeight: 90, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{card.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text, lineHeight: 1.2, textAlign: "center" }}>{card.title}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 14px 4px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Cuenta</div>
        <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid " + COLORS.border }}>
          {accountItems.map((item, i) => (
            <button key={i} onClick={item.action} style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "14px 16px",
              borderBottom: i < accountItems.length - 1 ? "1px solid #F3F4F6" : "none",
              background: "none", cursor: "pointer", border: "none",
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.danger ? COLORS.error : COLORS.text }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 11, color: COLORS.textLight }}>{item.sub}</div>}
              </div>
              <div style={{ fontSize: 16, color: "#D1D5DB" }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ page, navigate, profile, onViewLanding }) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  const role = profile?.role;
  const items = [
    { icon: "🏠", label: "Inicio", key: "home", action: () => navigate("home") },
    { icon: "🎂", label: "Amigos", key: "organize", action: () => navigate("organize") },
    { icon: "🎁", label: "Mi regalo", key: "miregalo", action: () => onViewLanding() },
    { icon: "🔔", label: "Notif.", key: "notif", action: () => navigate("notif") },
    { icon: "👤", label: "Perfil", key: "perfil", action: () => navigate("perfil") },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 70, background: "#fff", borderTop: "1px solid " + COLORS.border, display: "flex", alignItems: "stretch", boxShadow: "0 -4px 24px rgba(124,58,237,0.10)", zIndex: 200 }}>
      {items.map((item) => {
        const active = page === item.key || (item.key === "notif" && page === "notif");
        return (
          <button key={item.key} onClick={item.action} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, color: active ? COLORS.primary : COLORS.textLight }}>{item.label}</span>
            {active && <div style={{ width: 5, height: 5, background: COLORS.primary, borderRadius: "50%", marginTop: -1 }} />}
          </button>
        );
      })}
    </nav>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer({ isMobile }) {
  return (
    <footer style={{ borderTop: "1px solid " + COLORS.border, padding: isMobile ? "32px 20px 24px" : "36px 20px", textAlign: "center", marginTop: 40, paddingBottom: isMobile ? 90 : 36 }}>
      <Logo size={22} />
      <p style={{ fontSize: 13, color: COLORS.textLight, marginTop: 12, marginBottom: 0 }}>Hecho con 💜 en Argentina · © 2026 Cumpleanitos</p>
    </footer>
  );
}

// ─── ROUTING ─────────────────────────────────────────────────────────────────
const PAGE_ROUTES = {
  'home': '/',
  'perfil': '/perfil',
  'explore': '/explorar',
  'login': '/login',
  'register': '/registro',
  'dashboard': '/dashboard',
  'wishlist': '/deseos',
  'gifts-given': '/regalos',
  'manage-gifts': '/gestionar',
  'share': '/compartir',
  'settings-mobile': '/configuracion',
  'settings': '/configuracion',
  'notif': '/notificaciones',
  'admin': '/admin',
  'mp-callback': '/oauth/mp/callback',
  'mp-exito': '/pago/exito',
  'mp-pendiente': '/pago/pendiente',
  'mp-error': '/pago/error',
  'organize': '/organizar',
  'new-ui': '/new-ui',
};
const ROUTE_PAGES = Object.fromEntries(Object.entries(PAGE_ROUTES).map(([k, v]) => [v, k]));

function getInitialPage() {
  const path = window.location.pathname;
  if (path.startsWith('/u/')) return 'profile';
  if (path.startsWith('/invite/')) return 'invite';
  if (path === '/oauth/mp/callback') return 'mp-callback';
  if (path === '/pago/exito') return 'mp-exito';
  if (path === '/pago/pendiente') return 'mp-pendiente';
  if (path === '/pago/error') return 'mp-error';
  if (path === '/new-ui') return 'new-ui';
  // En TEST, la raíz va al nuevo UI
  const isTestEnv = typeof window !== 'undefined' && window.location.hostname.startsWith('test.');
  if (isTestEnv && path === '/') return 'new-ui';
  return ROUTE_PAGES[path] || 'home';
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState(getInitialPage);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileTarget, setProfileTarget] = useState(null);
  const [stats, setStats] = useState({ raised: 0, gifters: 0, friends: 0 });
  const [hasCampaign, setHasCampaign] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState(null);
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingPreregister, setOnboardingPreregister] = useState(null);
  const loginNavigatedRef = useRef(false);
  const hasCampaignTimeoutRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u"); const c = params.get("c");
    if (path.startsWith('/u/')) {
      const username = path.slice(3);
      if (username) { setProfileTarget({ username }); setPage("profile"); window.history.replaceState({}, "", "/u/" + username); }
    } else if (u) { setProfileTarget({ username: u }); setPage("profile"); }
    else if (c) { setProfileTarget({ campaignId: c }); setPage("profile"); }
    // Para otras rutas: getInitialPage() ya seteó page correctamente en useState
  }, []);

  useEffect(() => {
    let initialDone = false;

    // Timeout global de seguridad: si todo falla, desbloquear la app en 5s
    const globalTimeout = setTimeout(() => {
      setLoading(false);
      setHasCampaign(prev => prev === null ? false : prev);
    }, 5000);
    
    // LISTENER: detectar cuando app vuelve del background
    // IMPORTANTE: NO llamar getSession() ni refreshSession() aquí —
    // eso dispara onAuthStateChange(SIGNED_IN) que causa el freeze.
    // Supabase con autoRefreshToken:true maneja el refresh solo.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Solo desbloquear si quedó colgado — no tocar la sesión
        setLoading(false);
        setHasCampaign(prev => prev === null ? false : prev);
        if (hasCampaignTimeoutRef.current) {
          clearTimeout(hasCampaignTimeoutRef.current);
          hasCampaignTimeoutRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // getSession: carga inicial, corre una sola vez
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      initialDone = true;
      setSession(s);
      if (s) {
        setHasCampaign(null);
        // Timeout de seguridad: si loadStats tarda más de 4s, desbloquear igual
        if (hasCampaignTimeoutRef.current) clearTimeout(hasCampaignTimeoutRef.current);
        hasCampaignTimeoutRef.current = setTimeout(() => {
          setHasCampaign(prev => prev === null ? false : prev);
        }, 3000);
        await loadProfile(s.user.id);
        // Respetar la ruta actual si el usuario llegó a una ruta interna específica
        const currentPath = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        if (params.get("u") || params.get("c")) {
          // query params de perfil — ya manejados por el useEffect de URL
        } else if (currentPath !== '/') {
          // Está en una ruta específica (/explorar, /admin, etc.) — no redirigir
          // getInitialPage() ya seteó el page correcto al arrancar
        }
        // Si está en / — no redirigir, dejar que renderPage decida según sesión y hasCampaign
      } else {
        setHasCampaign(false);
      }
      setLoading(false);
      clearTimeout(globalTimeout);
    }).catch(() => { setHasCampaign(false); setLoading(false); clearTimeout(globalTimeout); });

    // onAuthStateChange: solo cambios reales post-inicial
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // Ignorar eventos que llegan mientras getSession ya corre
      if (!initialDone && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) return;

      if (event === "SIGNED_IN") {
        // SIGNED_IN se dispara por login real, refresh de token, y vuelta de background.
        // Solo actuar si NO hay sesión previa (post-logout genuino).
        // Si ya había sesión, ignorar — evita el freeze al volver de otra app.
        setSession(s);

      } else if (event === "TOKEN_REFRESHED" && s) {
        // Token refrescado: actualizar session sin re-cargar perfil ni mostrar spinner
        setSession(s);
        setLoading(false); // Desbloquear UI si estaba colgada
        // Si hasCampaign es null (estado colgado), resolverlo
        setHasCampaign(prev => prev === null ? false : prev);

      } else if (event === "SIGNED_OUT") {
        loginNavigatedRef.current = false;
        setSession(null);
        setProfile(null);
        setHasCampaign(false);
        setLoading(false);
        window.history.replaceState({}, "", "/"); setPage("home");

      } else if (event === "USER_UPDATED" && s) {
        setSession(s);
      }
    });
    
    // CLEANUP: limpiar todos los timers y listeners al desmontar
    return () => {
      subscription.unsubscribe();
      clearTimeout(globalTimeout);
      if (hasCampaignTimeoutRef.current) clearTimeout(hasCampaignTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // GUARDIÁN: si loading termina y hasCampaign sigue null, resolverlo a false
  // Esto evita el freeze infinito en cualquier código path
  useEffect(() => {
    if (!loading && hasCampaign === null) {
      setHasCampaign(false);
    }
  }, [loading, hasCampaign]);

  const loadProfile = async (userId) => {
    const profileTimeout = setTimeout(() => {
      // Si loadProfile tarda más de 6s, desbloquear la app igual
      setLoading(false);
      setHasCampaign(prev => prev === null ? false : prev);
    }, 6000);
    
    // Retry logic: esperar a que el trigger cree el profile (máximo 3 intentos con delay)
    let data = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts && !data) {
      const result = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      data = result.data;
      
      if (!data && attempts < maxAttempts - 1) {
        // Esperar 500ms antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      attempts++;
    }
    
    // Si después de 3 intentos no existe, crearlo manualmente (trigger falló)
    if (!data) {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const meta = user.user_metadata || {};
        // Si el registro normal guardó datos en metadata, usarlos en vez de placeholders
        const isNormalSignup = meta.username && meta.birthday;

        const name = meta.full_name || meta.name || user.email?.split("@")[0] || "Usuario";
        const username = isNormalSignup ? meta.username : 'user_' + user.id.substring(0, 8);
        const birthday = isNormalSignup ? meta.birthday : null;
        const phone = isNormalSignup ? (meta.phone || null) : null;
        const age = isNormalSignup ? (meta.age || null) : null;
        const days_to_birthday = isNormalSignup ? (meta.days_to_birthday || null) : null;

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          username,
          name,
          birthday,
          phone,
          age,
          days_to_birthday,
          role: meta.role || 'celebrant',
          email: user.email,
          email_verified: !!user.email_confirmed_at,
        });

        if (!insertError) {
          const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
          data = newProfile;
        }
      }
    }
    
    clearTimeout(profileTimeout);
    if (data) {
      // Detectar si es usuario nuevo de Google OAuth: provider es google Y perfil incompleto
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      const isGoogleProvider = authUser?.app_metadata?.provider === 'google';
      const isIncomplete = !data.birthday || !data.phone || (data.username && data.username.startsWith("user_"));
      const wasDeleted = data.deleted_at != null;  // Usuario eliminado que vuelve

      if ((isGoogleProvider && isIncomplete) || wasDeleted) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        const email = user?.email || "";
        const suggestedUsername = email
          .split("@")[0]
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 20);

        // ── P1 FIX: leer datos del preregistro desde localStorage ──
        let preregisterData = null;
        const savedFriendId = localStorage.getItem("pending_friend_id");
        if (savedFriendId) {
          const { data: frData } = await supabase
            .from("friend_preregisters")
            .select("name, birthday_day, birthday_month, estimated_next_age")
            .eq("id", savedFriendId)
            .maybeSingle();
          preregisterData = frData;
        }

        setProfile(data);
        setOnboardingUser(user);
        setOnboardingUsername(suggestedUsername);
        setOnboardingPreregister(preregisterData); // datos para pre-llenar
        setShowOnboarding(true);
        await loadStats(userId);
        return data;
      }

      setProfile(data);
    }
    await loadStats(userId);
    return data;
  };

  const loadStats = async (userId) => {
    const timeout = setTimeout(() => setHasCampaign(prev => prev === null ? false : prev), 3000);
    try {
      // 1. Campaña: crítico — se resuelve primero y por separado
      const campRes = await supabase
        .from("gift_campaigns").select("id")
        .eq("birthday_person_id", userId).eq("status", "active")
        .limit(1).maybeSingle();

      const hasCamp = !!campRes.data?.id;
      if (hasCampaignTimeoutRef.current) { clearTimeout(hasCampaignTimeoutRef.current); hasCampaignTimeoutRef.current = null; }
      setHasCampaign(hasCamp);
      clearTimeout(timeout);

      // 2. Stats secundarias — friends con timeout propio (tabla puede no existir en PROD)
      const friendsPromise = Promise.race([
        supabase.from("friends").select("id", { count: "exact", head: true }).eq("user_id", userId),
        new Promise(resolve => setTimeout(() => resolve({ count: 0, data: null, error: "timeout" }), 2000))
      ]);
      const [friendsRes, giftedRes] = await Promise.allSettled([
        friendsPromise,
        supabase.from("contributions").select("amount").eq("gifter_id", userId),
      ]);
      const friendCount = friendsRes.status === "fulfilled" ? (friendsRes.value?.count || 0) : 0;
      const gifted = giftedRes.status === "fulfilled" ? (giftedRes.value?.data || []) : [];
      const giftsGiven = gifted.length;
      const totalGifted = gifted.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

      if (hasCamp) {
        const contribRes = await supabase.from("contributions").select("amount, gifter_name").eq("campaign_id", campRes.data.id);
        const contribs = contribRes.data || [];
        const raised = contribs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
        setStats({ raised, gifters: contribs.length, friends: friendCount, giftsGiven, totalGifted });
      } else {
        setStats({ raised: 0, gifters: 0, friends: friendCount, giftsGiven, totalGifted });
      }
      return hasCamp;
    } catch(e) {
      clearTimeout(timeout);
      setHasCampaign(false);
      setStats({ raised: 0, gifters: 0, friends: 0, giftsGiven: 0, totalGifted: 0 });
      return false;
    }
  };

  const handleAuth = async (user) => {
    setHasCampaign(null);
    if (hasCampaignTimeoutRef.current) clearTimeout(hasCampaignTimeoutRef.current);
    hasCampaignTimeoutRef.current = setTimeout(() => {
      setHasCampaign(prev => prev === null ? false : prev);
    }, 3000);
    await loadProfile(user.id);
    navigate("perfil");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); navigate("home");
  };

  const viewProfile = (username) => navigate("profile", username);

  const navigateTo = (p) => {
    if (p === "register") window.history.pushState({}, "", "/registro");
    else if (p === "login") window.history.pushState({}, "", "/login");
    else window.history.pushState({}, "", "/");
    setPage(p);
  };

  // navigate() centralizado: actualiza page state + URL juntos
  const navigate = (p, username) => {
    if (p === 'profile' && username) {
      setProfileTarget({ username });
      setPage('profile');
      window.history.pushState({}, '', '/u/' + username);
    } else {
      const url = PAGE_ROUTES[p] || '/';
      window.history.pushState({}, '', url);
      setPage(p);
    }
  };

  const handleRoleSwitch = async (newRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", session.user.id);
    if (!error) { setProfile(prev => ({ ...prev, role: newRole })); navigate("dashboard"); }
  };

  const handleProfileUpdated = (updated) => setProfile(updated);

  const uploadFile = async (file, folder) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${session.user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cumple-images").upload(path, file, { upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    const { data: { publicUrl } } = supabase.storage.from("cumple-images").getPublicUrl(path);
    return publicUrl;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "avatars");
    if (!url) return;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "covers");
    if (!url) return;
    await supabase.from("profiles").update({ cover_url: url }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, cover_url: url }));
  };

  // New UI ocupa toda la pantalla sin navbar ni footer (antes del loading para que siempre muestre)
  if (page === "new-ui") {
    return <AppLayout />;
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: COLORS.textLight }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎂</div>Cargando...</div>
      </div>
    );
  }

  const noNavPages = ["perfil","wishlist","gifts-given","manage-gifts","settings-mobile","share","notif","mp-callback","organize","invite"];

  const renderPage = () => {
    switch (page) {
      case "home":
        if (session && (hasCampaign === null || !profile)) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color: COLORS.textLight }}><div style={{ textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>🎂</div>Cargando...</div></div>;
        if (session && hasCampaign === false) return <CelebrantDashboard profile={profile} session={session} defaultTab="campaign" onViewLanding={() => viewProfile(profile?.username)} onCampaignCreated={() => { setHasCampaign(true); loadStats(session.user.id); }} />;
        if (session && hasCampaign) return <ProfileScreen profile={profile} navigate={navigate} onLogout={handleLogout} stats={stats} onAvatarUpload={handleAvatarUpload} onCoverUpload={handleCoverUpload} onViewLanding={() => profile?.username ? viewProfile(profile.username) : navigate("dashboard")} />;
        return <HomePage onRegister={() => navigate("register")} onExplore={() => navigate("explore")} />;
      case "landing": return <HomePage onRegister={() => navigate("register")} onExplore={() => navigate("explore")} />;
      case "explore": return <ExplorePage onViewProfile={viewProfile} />;
      case "notif": return <NotificationsPage session={session} />;
      case "wishlist": return <WishListPage onBack={() => navigate("perfil")} />;
      case "gifts-given": return <GiftsGivenPage onBack={() => navigate("perfil")} />;
      case "manage-gifts": return <ManageGiftsPage onBack={() => navigate("perfil")} />;
      case "share": return <ShareProfilePage profile={profile} onBack={() => navigate("perfil")} onViewProfile={viewProfile} />;
      case "settings-mobile":
        return <SettingsPage profile={profile} session={session} onBack={() => navigate("perfil")} onProfileUpdated={handleProfileUpdated} />;
      case "perfil":
        if (!session) return <AuthPage initialMode="login" onAuth={handleAuth} onNavigate={navigateTo} />;
        if (hasCampaign === null || !profile) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color: COLORS.textLight }}><div style={{ textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>🎂</div>Cargando...</div></div>;
        if (!hasCampaign) return <CelebrantDashboard profile={profile} session={session} defaultTab="campaign" onViewLanding={() => viewProfile(profile?.username)} onCampaignCreated={() => { setHasCampaign(true); loadStats(session.user.id); }} />;
        return <ProfileScreen profile={profile} navigate={navigate} onLogout={handleLogout} stats={stats} onAvatarUpload={handleAvatarUpload} onCoverUpload={handleCoverUpload} onViewLanding={() => profile?.username ? viewProfile(profile.username) : navigate("dashboard")} />;
      case "login":
      case "register":
        if (session) {
          if (hasCampaign === null || !profile) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color: COLORS.textLight }}><div style={{ textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>🎂</div>Cargando...</div></div>;
          if (!hasCampaign) return <CelebrantDashboard profile={profile} session={session} defaultTab="campaign" onViewLanding={() => viewProfile(profile?.username)} onCampaignCreated={() => { setHasCampaign(true); loadStats(session.user.id); }} />;
          return <ProfileScreen profile={profile} navigate={navigate} onLogout={handleLogout} stats={stats} onAvatarUpload={handleAvatarUpload} onCoverUpload={handleCoverUpload} onViewLanding={() => profile?.username ? viewProfile(profile.username) : navigate("dashboard")} />;
        }
        return <AuthPage key={page} initialMode={page} onAuth={handleAuth} onNavigate={navigateTo} />;
      case "dashboard":
        if (!session) return <AuthPage initialMode="login" onAuth={handleAuth} onNavigate={navigateTo} />;
        if (!profile) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color: COLORS.textLight }}><div style={{ textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>🎂</div>Cargando...</div></div>;
        if (profile?.role === "gifter") return <ExplorePage onViewProfile={viewProfile} />;
        if (profile?.role === "manager") return <ManagerDashboard profile={profile} session={session} />;
        return <CelebrantDashboard profile={profile} session={session} defaultTab="campaign" onViewLanding={() => viewProfile(profile?.username)} />;
      case "settings":
        if (!session) return <AuthPage initialMode="login" onAuth={handleAuth} onNavigate={navigateTo} />;
        if (!profile) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", color: COLORS.textLight }}><div style={{ textAlign:"center" }}><div style={{ fontSize:40, marginBottom:12 }}>🎂</div>Cargando...</div></div>;
        if (profile?.role === "gifter") return <ExplorePage onViewProfile={viewProfile} />;
        if (profile?.role === "manager") return <ManagerDashboard profile={profile} session={session} />;
        return <CelebrantDashboard profile={profile} session={session} defaultTab="settings" onViewLanding={() => viewProfile(profile?.username)} />;
      case "profile":
        return <ProfilePage username={profileTarget?.username} campaignId={profileTarget?.campaignId} currentSession={session} currentProfile={profile} />;
      case "admin":
        return null; // handled by early return above
      case "mp-callback":
        return <MPOAuthCallbackPage />;
      case "mp-exito":
      case "mp-pendiente":
      case "mp-error":
        return <MPPaymentResultPage navigate={navigate} />;
      case "organize":
        if (!session) return <AuthPage initialMode="login" onAuth={handleAuth} onNavigate={navigateTo} />;
        return <OrganizeBirthdayPage session={session} profile={profile} navigate={navigate} />;
      case "invite": {
        const inviteToken = window.location.pathname.replace('/invite/', '');
        return <InviteLandingPage token={inviteToken} />;
      }
      default:
        return <HomePage onRegister={() => navigate("register")} onExplore={() => navigate("explore")} />;
    }
  };

  const hideFooter = noNavPages.includes(page);

  // Si está en proceso de completar perfil de Google, mostrar solo esa pantalla
  if (showOnboarding && onboardingUser) {
    return (
      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
        <CompleteProfilePage
          user={onboardingUser}
          suggestedUsername={onboardingUsername}
          preregisterData={onboardingPreregister}
          onComplete={async (updatedProfile) => {
            setShowOnboarding(false);
            setProfile(updatedProfile);
            localStorage.removeItem("pending_friend_id");
            localStorage.removeItem("pending_invite_token");
            await loadStats(onboardingUser.id);
            setPage("perfil");
          }}
        />
      </div>
    );
  }

  // Admin ocupa toda la pantalla sin navbar ni footer
  if (page === "admin") {
    return <AdminShell profile={profile} onExit={() => navigate("home")} />;
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <Navbar page={page} navigate={navigate} session={session} profile={profile} onLogout={handleLogout} onRoleSwitch={handleRoleSwitch} onViewLanding={() => profile?.username ? viewProfile(profile.username) : navigate("dashboard")} />
      <main style={{ paddingBottom: isMobile && session ? 70 : 0 }}>
        {renderPage()}
      </main>
      {!hideFooter && <Footer isMobile={isMobile} />}
      {session && <BottomNav page={page} navigate={navigate} profile={profile} onViewLanding={() => profile?.username ? viewProfile(profile.username) : navigate("dashboard")} />}
    </div>
  );
}
