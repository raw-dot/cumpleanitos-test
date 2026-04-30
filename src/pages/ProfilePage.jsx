import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  COLORS, Button, Card, Avatar, Badge, Input, Textarea, Alert,
  ProgressBar,
  getInitials, formatMoney, formatBirthday, daysUntilBirthday,
} from "../shared";
import { getRealAlias } from "../utils/paymentAliasHelpers";
import EmotionalStep from "../components/ui/EmotionalStep";
import { useMPConnection } from "../hooks/useMPConnection";

// Leer montos desde config (localStorage con fallback a defaults)
const getPresetAmounts = () => {
  try {
    const cfg = localStorage.getItem('admin_config');
    if (cfg) {
      const parsed = JSON.parse(cfg);
      if (Array.isArray(parsed.gift_amounts) && parsed.gift_amounts.length >= 2) {
        return parsed.gift_amounts;
      }
    }
  } catch {}
  return [500, 1000, 2000, 5000];
};

export default function ProfilePage({ username, campaignId, currentSession, currentProfile }) {
  const [presetAmounts, setPresetAmounts] = useState(getPresetAmounts());

  // Sincronizar montos desde Supabase al montar (para que funcione en todos los navegadores)
  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'platform').maybeSingle()
      .then(({ data }) => {
        if (data?.value?.gift_amounts?.length >= 2) {
          setPresetAmounts(data.value.gift_amounts);
          try {
            const existing = JSON.parse(localStorage.getItem('admin_config') || '{}');
            localStorage.setItem('admin_config', JSON.stringify({ ...existing, gift_amounts: data.value.gift_amounts }));
          } catch {}
        }
      });
  }, []);

  const [profile, setProfile] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [items, setItems] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [preSelectedItem, setPreSelectedItem] = useState(null);
  const [form, setForm] = useState({ amount: "", name: "", contact: "", message: "", anonymous: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Paso activo: 1=monto, 2=datos, 3=mensaje especial, 4=confirmar
  const [step, setStep] = useState(1);
  // Datos del paso emocional
  const [emotional, setEmotional] = useState({ message: "", foto: null, video: null });
  const [mpLoading, setMpLoading] = useState(false);
  const [mpWaiting, setMpWaiting] = useState(false); // overlay desktop
  const [paymentResult, setPaymentResult] = useState(null); // comprobante inline
  const [organizer, setOrganizer] = useState(null); // perfil del organizador de la campaña
  const pollRef = useRef(null);

  // Conexión MP del cumpleañero (para saber si puede recibir pagos)
  const { connection: sellerMPConnection } = useMPConnection(profile?.id);

  // Pre-fill form with logged-in user data when component mounts or session changes
  useEffect(() => {
    if (currentSession && currentProfile) {
      setForm(p => ({ ...p, name: currentProfile?.name || currentSession.user.email }));
    }
  }, [currentSession, currentProfile]);

  const totalRaised = contributions.reduce((s, c) => s + (c.amount || 0), 0);
  const days = profile?.birthday ? daysUntilBirthday(profile.birthday) : campaign?.birthday_date ? daysUntilBirthday(campaign.birthday_date) : null;

  useEffect(() => { loadData(); }, [username, campaignId]);

  // Real-time subscription for new contributions
  useEffect(() => {
    if (!campaign?.id) return;
    const channel = supabase
      .channel(`contributions-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `campaign_id=eq.${campaign.id}` }, (payload) => {
        setContributions(prev => {
          // add new contribution if not already present
          if (prev.find(c => c.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [campaign?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      let camp = null;
      let prof = null;

      if (campaignId) {
        const { data } = await supabase.from("gift_campaigns").select("*").eq("id", campaignId).maybeSingle();
        camp = data;
        if (camp?.birthday_person_id) {
          const { data: p } = await supabase.from("profiles").select("*").eq("id", camp.birthday_person_id).maybeSingle();
          prof = p;
        }
      } else if (username) {
        const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
        prof = p;
        if (p) {
          const { data: c } = await supabase.from("gift_campaigns").select("*").eq("birthday_person_id", p.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (c) {
            camp = c;
          } else {
            const { data: cAny } = await supabase.from("gift_campaigns").select("*").eq("birthday_person_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
            camp = cAny;
          }
        }
      }

      setProfile(prof);
      setCampaign(camp);

      if (camp) {
        const [{ data: itemsData }, { data: contribData }] = await Promise.all([
          supabase.from("gift_items").select("*").eq("campaign_id", camp.id).order("created_at"),
          supabase.from("contributions").select("*").eq("campaign_id", camp.id).order("created_at", { ascending: false }),
        ]);
        if (itemsData) setItems(itemsData);
        if (contribData) setContributions(contribData);

        // Cargar perfil del organizador
        if (camp.created_by) {
          const { data: orgData } = await supabase.from("profiles").select("id, name, avatar_url, username").eq("id", camp.created_by).maybeSingle();
          setOrganizer(orgData || null);
        }
      }
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openContributeForItem = (item) => {
    setPreSelectedItem(item);
    setForm(p => ({ ...p, amount: item.price?.toString() || "" }));
    setShowContributeForm(true);
    setStep(1);
    setEmotional({ message: "", foto: null, video: null });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = profile
      ? `¡Ayudame a juntar para mi regalo de cumpleaños! 🎁🎂`
      : `¡Mirá este regalo de cumpleaños!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title || 'Regalo de cumpleaños',
          text: shareText,
          url: url,
        });
      } catch (e) {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('¡Link copiado al portapapeles! 🔗');
      setTimeout(() => setSuccess(''), 3000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setSuccess('¡Link copiado! 🔗');
      setTimeout(() => setSuccess(''), 3000);
    });
  };

  const submitContribution = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Ingresá un monto válido"); return; }
    if (!form.name && !form.anonymous && !currentSession) { setError("Ingresá tu nombre o marcá la opción anónimo"); return; }

    setSubmitting(true);
    setError("");

    try {
      const amount = parseFloat(form.amount);
      const gifterName = form.anonymous ? null : (currentSession ? (currentProfile?.name || currentSession.user.email) : form.name);
      const finalMessage = emotional.message || form.message || null;
      // Usamos storageUrl (URL pública de Supabase Storage).
      // Si no está disponible (fallo de upload), cae a previewUrl como fallback.
      const fotoUrl  = emotional.foto?.storageUrl  || null;
      const videoUrl = emotional.video?.storageUrl || null;
      const { error: err } = await supabase.from("contributions").insert({
        campaign_id: campaign.id,
        gifter_id: currentSession?.user?.id || null,
        gifter_name: gifterName,
        gifter_contact: form.anonymous ? null : (form.contact || null),
        amount: amount,
        message: finalMessage,
        is_anonymous: form.anonymous,
        emotional_foto_url: fotoUrl,
        emotional_video_url: videoUrl,
      });

      if (err) { setError("Error al registrar el regalo. Intentá de nuevo."); return; }

      const { data: contribData } = await supabase.from("contributions").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false });
      if (contribData) setContributions(contribData);

      setShowContributeForm(false);
      setPreSelectedItem(null);
      setStep(1);
      setEmotional({ message: "", foto: null, video: null });
      setForm({ amount: "", name: "", contact: "", message: "", anonymous: false });
      setSuccess(`¡Gracias por tu regalo! 🎉 Ahora hacé la transferencia de ${formatMoney(amount)} al alias: ${getRealAlias(profile?.payment_alias) || "pendiente de confirmar"}`);
    } catch (e) {
      setError("Error inesperado. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80, color: COLORS.textLight }}>Cargando perfil...</div>;
  }

  if (!profile && !campaign) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
        <h2 style={{ margin: "0 0 8px" }}>Perfil no encontrado</h2>
        <p style={{ color: COLORS.textLight }}>El usuario o regalo que buscás no existe.</p>
      </div>
    );
  }

  const displayName = profile?.name || campaign?.birthday_person_name || "Cumpleañero";
  const isToday = days === "¡Hoy!";
  const isSoon = typeof days === "number" && days <= 7;

  return (
    <>
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: COLORS.bg, minHeight: "100vh" }}>
      {/* ── SUCCESS ALERT ── */}
      {success && (
        <div style={{ background: COLORS.success, color: "#fff", padding: "20px", textAlign: "center", fontWeight: 600, borderBottom: `1px solid ${COLORS.success}CC` }}>
          ✓ {success}
        </div>
      )}

      {/* ── HERO SECTION — portada + avatar con foto real ── */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.accent}15 100%)` }}>
        {/* Portada */}
        <div style={{
          height: 160, width: "100%",
          background: profile?.cover_url
            ? `url(${profile.cover_url}) ${profile.cover_position || "center"}/cover no-repeat`
            : profile?.cover_gradient
            ? profile.cover_gradient
            : `linear-gradient(135deg, ${COLORS.primary} 0%, #9C27B0 40%, ${COLORS.accent} 100%)`,
        }} />
        {/* Avatar centrado sobre portada */}
        <div style={{ textAlign: "center", marginTop: -44, paddingBottom: 0 }}>
          {isToday ? (
            <div style={{ fontSize: 80 }}>🥳</div>
          ) : (
            <div style={{ display: "inline-block", position: "relative" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", display: "block" }} />
                : <Avatar initials={profile ? getInitials(profile.name) : "🎂"} size={88} style={{ border: "4px solid #fff", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }} />
              }
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 36, fontWeight: 900, color: COLORS.text }}>{displayName}</h1>
          <p style={{ margin: "0 0 16px", color: COLORS.textLight, fontSize: 16 }}>
            Cumpleaños el {formatBirthday(profile?.birthday || campaign?.birthday_date || "")}
          </p>
          {isToday ? (
            <Badge color={COLORS.accent} style={{ display: "inline-block" }}>🎉 ¡Hoy es su cumple!</Badge>
          ) : (
            <Badge color={COLORS.primary} style={{ display: "inline-block" }}>
              {typeof days === "number" ? `Faltan ${days} días` : days}
            </Badge>
          )}
          <div style={{ marginTop: 24 }}>
            <Button size="lg" onClick={() => {
              setShowContributeForm(true);
              setStep(1);
              setEmotional({ message: "", foto: null, video: null });
              setTimeout(() => document.getElementById("contribute-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}>
              Aportar al regalo
            </Button>
          </div>
          {/* Share button */}
          <div style={{ marginTop: 12 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              🔗 Compartir regalo
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 60px" }}>
        {/* ── EL REGALO SECTION ── */}
        {campaign ? (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: COLORS.text }}>El regalo 🎁</h2>

            {campaign.image_url && (
              <div style={{
                marginBottom: 24,
                borderRadius: 16,
                overflow: "hidden",
                width: "100%",
                maxWidth: "100%",
                background: COLORS.border,
                aspectRatio: "16/9",
                position: "relative",
              }}>
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  style={{
                    position: "absolute",
                    top: 0, left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: 16,
                  }}
                />
              </div>
            )}

            <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", color: COLORS.text }}>{campaign.title}</h3>

            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
              {campaign.goal_amount > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: COLORS.textLight }}>Meta del regalo</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary }}>{formatMoney(campaign.goal_amount)}</span>
                  </div>
                  <ProgressBar value={totalRaised} max={campaign.goal_amount} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                    <span style={{ color: COLORS.success, fontWeight: 700 }}>{Math.round((totalRaised / campaign.goal_amount) * 100)}% recaudado</span>
                    <span style={{ color: COLORS.textLight }}>Faltan {formatMoney(Math.max(0, campaign.goal_amount - totalRaised))}</span>
                  </div>
                  <div style={{ borderTop: "1px dashed #E5E7EB", marginTop: 14, paddingTop: 14, display: "flex", gap: 28 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: COLORS.success, fontSize: 18 }}>{formatMoney(totalRaised)}</div>
                      <div style={{ color: COLORS.textLight, fontSize: 12 }}>Recaudado</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{contributions.length}</div>
                      <div style={{ color: COLORS.textLight, fontSize: 12 }}>Aportantes</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── ORGANIZADOR ── */}
            {organizer ? (
              <div
                onClick={() => organizer.username && (window.location.href = "/u/" + organizer.username)}
                style={{
                  background: "#F5F3FF", borderRadius: 14, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
                  cursor: organizer.username ? "pointer" : "default",
                }}
              >
                {organizer.avatar_url
                  ? <img src={organizer.avatar_url} alt={organizer.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                  : <Avatar initials={getInitials(organizer.name || "?")} size={40} />
                }
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>Organizado por</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{organizer.name}</div>
                </div>
              </div>
            ) : campaign ? (
              <button
                onClick={() => window.location.href = "/organizar"}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 14, border: "none",
                  background: COLORS.primary, color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
                }}
              >
                ¿Querés organizarlo?
              </button>
            ) : null}

            {campaign.description && (
              <Card style={{ background: COLORS.card, padding: 20, marginBottom: 24 }}>
                <p style={{ margin: 0, color: COLORS.text, lineHeight: 1.7, fontSize: 15 }}>{campaign.description}</p>
              </Card>
            )}

            {campaign.product_link && (
              <Card style={{ background: COLORS.bg, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 24 }}>🔗</span>
                <Button variant="outline" size="sm" onClick={() => window.open(campaign.product_link, "_blank")} style={{ marginLeft: "auto" }}>
                  Ver producto →
                </Button>
              </Card>
            )}
          </div>
        ) : (
          <Card style={{ textAlign: "center", padding: 40, marginBottom: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <p style={{ color: COLORS.textLight }}>Este usuario todavía no tiene un regalo activo.</p>
          </Card>
        )}

        {/* ── WISHLIST SECTION ── */}
        {items.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: COLORS.text }}>Lista de deseos 🎁</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(item => (
                <Card key={item.id} style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex" }}>
                    {/* Precio */}
                    <div style={{
                      background: item.is_fulfilled ? "#F0FDF4" : `linear-gradient(160deg, ${COLORS.primary}12, ${COLORS.accent}08)`,
                      padding: "20px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 100,
                      borderRight: `1px solid ${COLORS.border}`,
                      gap: 4,
                    }}>
                      <span style={{ fontSize: 26 }}>🎁</span>
                      {item.price ? (
                        <div style={{ fontSize: 15, fontWeight: 800, color: item.is_fulfilled ? COLORS.success : COLORS.primary, textAlign: "center" }}>
                          {formatMoney(item.price)}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: COLORS.textLight, textAlign: "center" }}>Precio libre</div>
                      )}
                    </div>
                    {/* Info + acciones */}
                    <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.4 }}>{item.description}</div>
                      )}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                        {item.item_url && (
                          <a
                            href={item.item_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 13, color: COLORS.primary, textDecoration: "none", fontWeight: 600 }}
                          >
                            🔗 Ver producto
                          </a>
                        )}
                        {!item.is_fulfilled && (
                          <button
                            onClick={() => {
                              openContributeForItem(item);
                              setTimeout(() => document.getElementById("contribute-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                            }}
                            style={{
                              padding: "6px 14px",
                              background: COLORS.primary,
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Aportar para esto
                          </button>
                        )}
                        {item.is_fulfilled && (
                          <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 700 }}>✓ Ya regalado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── APORTAR SECTION — 4 pasos ── */}
        {campaign && (
          <div id="contribute-section" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: COLORS.text }}>Aportar para el regalo</h2>

            <Card style={{ padding: 24 }}>
              {/* ── Stepper — 2 pasos ── */}
              <div style={{ display: "flex", marginBottom: 24 }}>
                {[
                  { n: 1, label: "Monto" },
                  { n: 2, label: "Mensaje y confirmar" },
                ].map(({ n, label }, idx, arr) => (
                  <div key={n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    {idx < arr.length - 1 && (
                      <div style={{ position: "absolute", top: 12, left: "55%", width: "90%", height: 1, background: n < step ? COLORS.primary : COLORS.border, zIndex: 0 }} />
                    )}
                    <div style={{ width: 24, height: 24, borderRadius: "50%", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginBottom: 4, background: n < step ? COLORS.primary : n === step ? COLORS.primary : COLORS.border, color: n <= step ? "#fff" : COLORS.textLight, boxShadow: n === step ? `0 0 0 4px ${COLORS.primaryLight}40` : "none" }}>
                      {n < step ? "✓" : n}
                    </div>
                    <div style={{ fontSize: 10, color: n === step ? COLORS.primary : COLORS.textLight, fontWeight: n === step ? 700 : 400 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* ── PASO 1: Monto + nombre si no está logueado ── */}
              {step === 1 && (
                <div>
                  <p style={{ color: COLORS.textLight, marginBottom: 16, fontSize: 14 }}>Montos sugeridos</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {presetAmounts.map(amount => (
                      <button
                        key={amount}
                        onClick={() => { setForm(p => ({ ...p, amount: amount.toString() })); setPreSelectedItem(null); }}
                        style={{ padding: "14px 8px", borderRadius: 12, border: `1px solid ${form.amount === amount.toString() ? COLORS.primary : COLORS.border}`, background: form.amount === amount.toString() ? COLORS.primary : COLORS.card, color: form.amount === amount.toString() ? "#fff" : COLORS.text, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        {formatMoney(amount)}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: COLORS.textLight, display: "block", marginBottom: 6 }}>O ingresá otro monto</label>
                    <Input type="number" inputMode="numeric" pattern="[0-9]*" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} placeholder="Monto en ARS" min="1" onFocusCapture={e => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)} />
                  </div>
                  {/* Nombre solo si NO está logueado */}
                  {!currentSession && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 13, color: COLORS.textLight, display: "block", marginBottom: 6 }}>Tu nombre <span style={{ fontSize: 11, opacity: 0.7 }}>(opcional)</span></label>
                      <Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="¿Cómo querés que te vea el festejado?" />
                    </div>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, marginBottom: 20 }}>
                    <input type="checkbox" checked={form.anonymous} onChange={e => setForm(p => ({ ...p, anonymous: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer", accentColor: COLORS.primary }} />
                    <span>Aportar de forma anónima</span>
                  </label>
                  <Alert message={error} type="error" />
                  <Button size="lg" style={{ width: "100%" }} onClick={() => {
                    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Ingresá un monto válido"); return; }
                    setError(""); setStep(2);
                  }}>
                    Continuar →
                  </Button>
                </div>
              )}

              {/* ── PASO 2: Mensaje emocional + pago MP ── */}
              {step === 2 && (
                <div>
                  <EmotionalStep
                    value={emotional}
                    onChange={setEmotional}
                    birthdayDate={profile?.birthday || campaign?.birthday_date || null}
                  />

                  {/* Resumen de fondos
                      LÓGICA CORRECTA del split MP:
                      - El PAGADOR abona el monto bruto completo (lo que tipea)
                      - MP internamente divide: marketplace_fee → Cumpleanitos / resto → cumpleañero
                      - El cumpleañero recibe: bruto − comisión_MP_propia − marketplace_fee_cumpleanitos
                      - Nota: la comisión de MP (~3-5%) también sale del bolsillo del cumpleañero,
                        igual que en cualquier cobro MP normal. No la mostramos para no confundir.
                  */}
                  {(() => {
                    const commissionEnabled = campaign?.commission_enabled !== false;
                    const commissionPct     = commissionEnabled ? (Number(campaign?.commission_percentage) || 10) : 0;
                    const amount            = parseFloat(form.amount) || 0;
                    // marketplace_fee: monto exacto que Cumpleanitos retiene (igual que en el backend)
                    const platformFee       = Math.round(amount * (commissionPct / 100));
                    // Estimado de lo que recibe el cumpleañero (sin contar comisión propia de MP ~3-5%)
                    const receivesAmount    = amount - platformFee;

                    return (
                      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: 14, marginTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: "#6B7280" }}>Tu aporte</span>
                          <span style={{ fontWeight: 600, color: "#111827" }}>{formatMoney(amount)}</span>
                        </div>
                        {commissionEnabled && commissionPct > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                            <span style={{ color: "#6B7280" }}>{`Comisión Cumpleañitos (${commissionPct}%)`}</span>
                            <span style={{ fontWeight: 600, color: "#6B7280" }}>{"−" + formatMoney(platformFee)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #DDD6FE", paddingTop: 6 }}>
                          <span style={{ fontWeight: 600 }}>Recibe el cumpleañero</span>
                          <span style={{ fontWeight: 700, color: "#16a34a" }}>
                            {commissionPct > 0 ? `~${formatMoney(receivesAmount)}` : formatMoney(receivesAmount)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                          ⚡ Acreditación inmediata con débito o saldo MP
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sin cuenta MP conectada */}
                  {sellerMPConnection === false && (
                    <Card style={{ background: "#FEF9C3", border: "1px solid #FDE68A", padding: 14, marginTop: 12 }}>
                      <div style={{ fontSize: 13, color: "#92400E" }}>
                        ⚠️ El cumpleañero aún no configuró su método de cobro.
                      </div>
                    </Card>
                  )}

                  <Alert message={error} type="error" style={{ marginTop: 12 }} />

                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {sellerMPConnection && (
                      <button
                        disabled={mpLoading}
                        onClick={async () => {
                          setMpLoading(true);
                          setError("");
                          try {
                            const amount    = parseFloat(form.amount);
                            const payerName = form.anonymous ? "Anónimo" : (form.name || currentProfile?.name || "Invitado");
                            const res  = await fetch("/api/mp-create-preference", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                campaignId:       campaign.id,
                                giftItemId:       preSelectedItem?.id || null,
                                sellerUserId:     profile.id,
                                payerName,
                                payerUserId:      currentSession?.user?.id || null,
                                isAnonymous:      form.anonymous,
                                message:          emotional.message || null,
                                fotoUrl:          emotional.foto?.storageUrl  || null,
                                videoUrl:         emotional.video?.storageUrl || null,
                                amount,
                                isMobile:         /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                                userToken:        currentSession?.access_token || null,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok || !data.init_point) {
                              setError(data.error || "Error al iniciar el pago. Intentá de nuevo.");
                              setMpLoading(false);
                              return;
                            }

                            // ── Apertura de MP ──────────────────────────────
                            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                            const externalRef = data.external_reference;

                            if (isMobile) {
                              setMpLoading(false);
                              window.location.href = data.init_point;
                              return;
                            }

                            // Redirect directo (mobile y desktop)
                            // El pop-up bloqueaba la UX y quedaba pequeño en desktop
                            // Cuando MP complete el pago, redirige a /pago/exito
                            // donde se llama a mp-confirm-payment y se graba todo
                            window.location.href = data.init_point;
                            return;
                          } catch {
                            setError("Error de conexión. Intentá de nuevo.");
                            setMpLoading(false);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                          width: "100%", padding: 15, borderRadius: 12,
                          background: mpLoading ? "#9CA3AF" : "#009EE3",
                          color: "#fff", fontSize: 15, fontWeight: 700,
                          border: "none", cursor: mpLoading ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>MP</span>
                        {mpLoading ? "Preparando pago..." : "Pagar con Mercado Pago"}
                      </button>
                    )}

                    {/* ── NUEVO: Boton de Transferencia (Cualquier banco) ── */}
                    {true && (
                      <button
                        disabled={mpLoading}
                        onClick={() => {
                          try {
                            const commissionEnabled = campaign?.commission_enabled !== false;
                            const commissionPct = commissionEnabled ? (Number(campaign?.commission_percentage) || 10) : 0;
                            const amount = parseFloat(form.amount) || 0;
                            const totalToPay = Math.round(amount + (amount * (commissionPct / 100)));
                            
                            // URL de transferencia de MP con alias/CVU/CBU
                            const alias = profile?.payment_alias || "";
                            const transferUrl = `https://www.mercadopago.com.ar/money-out/transfer/calculator?amount=${totalToPay}&receiver_info=${encodeURIComponent(alias)}`;
                            
                            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                            if (isMobile) {
                              window.location.href = transferUrl;
                            } else {
                              window.open(transferUrl, "_blank");
                            }
                          } catch (err) {
                            setError("Error al abrir transferencia. Intentá de nuevo.");
                            console.error("Error en transferencia:", err);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                          width: "100%", padding: 15, borderRadius: 12,
                          background: "#fff",
                          color: "#111827", fontSize: 15, fontWeight: 700,
                          border: "2px solid #D1D5DB",
                          cursor: mpLoading ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>💸</span>
                        Pagar con Transferencia Bancaria
                      </button>
                    )}

                    <Button variant="ghost" style={{ width: "100%", color: COLORS.textLight, fontSize: 14 }} onClick={() => setStep(1)}>
                      ← Volver
                    </Button>
                  </div>
                  <p style={{ fontSize: 11, color: COLORS.textLight, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
                    Serás redirigido a Mercado Pago de forma segura
                  </p>
                  {profile?.payment_alias && (
                    <p style={{ fontSize: 10, color: "#6B7280", textAlign: "center", marginTop: 4, lineHeight: 1.4 }}>
                      Pago instantáneo, abre directamente Mercado Pago
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── QUIENES REGALARON SECTION ── */}
        {contributions.length > 0 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: COLORS.text }}>Quiénes regalaron 💝</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {contributions.map(c => (
                <Card key={c.id} style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={c.is_anonymous ? "💝" : getInitials(c.gifter_name || "?")} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>
                      {c.is_anonymous ? "Alguien especial 💝" : (c.gifter_name || "Anónimo")}
                    </div>
                    {c.created_at && (
                      <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>
                        {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })} · {new Date(c.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" })}
                      </div>
                    )}
                    {c.message && (
                      <div style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4, fontStyle: "italic" }}>"{c.message}"</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, color: COLORS.success, fontSize: 15 }}>{formatMoney(c.amount)}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── WAITING OVERLAY desktop ── */}
    {mpWaiting && (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"40px 28px", maxWidth:400, width:"100%", textAlign:"center", boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"#009EE3", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:28 }}>💳</div>
          <h3 style={{ fontSize:19, fontWeight:800, color:"#111827", margin:"0 0 10px" }}>Completá el pago en la ventana de Mercado Pago</h3>
          <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.65, margin:"0 0 24px" }}>Terminá de pagar allá y esta pantalla se actualizará automáticamente.</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#EFF9FF", borderRadius:12, padding:"12px 20px", marginBottom:24 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#009EE3", animation:"mpPulse 1.4s ease-in-out infinite" }} />
            <span style={{ fontSize:13, color:"#009EE3", fontWeight:700 }}>Esperando confirmación de pago...</span>
          </div>
          <style>{"@keyframes mpPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,158,227,0.5)}50%{box-shadow:0 0 0 8px rgba(0,158,227,0)}}"}</style>
          <button onClick={() => { if(pollRef.current){clearInterval(pollRef.current);pollRef.current=null;} setMpWaiting(false); }}
            style={{ background:"none", border:"1px solid #E5E7EB", borderRadius:10, padding:"10px 24px", color:"#9CA3AF", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            Cancelar
          </button>
        </div>
      </div>
    )}

    {/* ── COMPROBANTE inline después de pago aprobado (desktop) ── */}
    {paymentResult && (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(249,250,251,0.97)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"32px 24px", maxWidth:440, width:"100%", border:"1px solid #E5E7EB", boxShadow:"0 8px 32px rgba(0,0,0,0.1)", textAlign:"center", margin:"auto" }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#16a34a", margin:"0 0 8px" }}>¡Aporte registrado!</h2>
          <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.6, marginBottom:24 }}>Tu aporte fue procesado. El cumpleañero lo verá reflejado en breve.</p>
          <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:12, overflow:"hidden", marginBottom:24, textAlign:"left" }}>
            <div style={{ background:"rgba(0,0,0,0.04)", padding:"8px 14px", fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Resumen del aporte</div>
            <div style={{ padding:"12px 14px" }}>
              {[
                ["Para",           paymentResult.order?.gift_campaigns?.birthday_person_name],
                ["Monto aportado", paymentResult.order?.gross_amount ? "$"+Number(paymentResult.order.gross_amount).toLocaleString("es-AR") : null],
                ["Tu nombre",      paymentResult.order?.is_anonymous ? "Anónimo 💝" : paymentResult.order?.payer_name],
                ["Referencia",     paymentResult.externalRef],
              ].filter(([,v])=>v).map(([label,value])=>(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"0.5px solid #86efac", fontSize:13 }}>
                  <span style={{ color:"#6B7280" }}>{label}</span>
                  <span style={{ fontWeight:600, color:"#111827", fontSize:label==="Referencia"?10:13 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={async () => {
              setPaymentResult(null);
              const bpId = paymentResult.order?.gift_campaigns?.birthday_person_id;
              if (bpId) {
                const { data } = await supabase.from("profiles").select("username").eq("id", bpId).maybeSingle();
                if (data?.username) { window.history.pushState({}, "", "/u/"+data.username); window.dispatchEvent(new PopStateEvent("popstate")); return; }
              }
              setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior:"smooth" }), 100);
            }} style={{ width:"100%", padding:14, borderRadius:12, background:COLORS.primary, color:"#fff", border:"none", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Ver el regalo de {paymentResult.order?.gift_campaigns?.birthday_person_name || "cumpleañero"} 🎂
            </button>
            <button onClick={() => { setPaymentResult(null); setTimeout(()=>{ window.history.pushState({},""," /explorar"); window.dispatchEvent(new PopStateEvent("popstate")); },50); }}
              style={{ width:"100%", padding:12, borderRadius:12, background:"transparent", border:"1px solid #E5E7EB", color:"#6B7280", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              Explorar otros regalos
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}
