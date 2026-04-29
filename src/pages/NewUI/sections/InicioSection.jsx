import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Gift, Gamepad2, ChevronRight, Sparkles, Cake } from 'lucide-react';
import { C, getInitial, calcDaysUntil, formatCurrency } from '../theme';
import { supabase } from '../../../supabaseClient';

export default function InicioSection({ profile, isMobile, session, handleTabChange }) {
  const [upcomingFriends, setUpcomingFriends] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const loadData = async () => {
    try {
      // Intentar cargar amigos desde la tabla friends
      // Fallback: usar todos los perfiles con cumpleaños próximos
      let friends = [];

      // Opción 1: Friends table con join
      try {
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', session.user.id);

        if (!friendsError && friendsData && friendsData.length > 0) {
          // Cargar perfiles de esos amigos
          const friendIds = friendsData.map(f => f.friend_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, full_name, username, avatar_url, birthday')
            .in('id', friendIds)
            .not('birthday', 'is', null);

          if (profilesData) {
            friends = profilesData;
          }
        }
      } catch (err) {
        console.log('Friends table not available, using all profiles');
      }

      // Fallback: si no hay amigos, mostrar perfiles random con cumples próximos
      if (friends.length === 0) {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, name, full_name, username, avatar_url, birthday')
          .neq('id', session.user.id)
          .not('birthday', 'is', null)
          .limit(20);

        if (allProfiles) {
          friends = allProfiles;
        }
      }

      // Calcular días y filtrar
      const withDays = friends
        .map(f => ({
          id: f.id,
          name: f.name || f.full_name || f.username,
          username: f.username,
          avatar_url: f.avatar_url,
          birthday: f.birthday,
          days: calcDaysUntil(f.birthday),
        }))
        .filter(f => f.days !== null && f.days >= 0)
        .sort((a, b) => a.days - b.days)
        .slice(0, 8);

      setUpcomingFriends(withDays);

      // Cargar campaña activa propia
      const { data: campData } = await supabase
        .from('gift_campaigns')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (campData) setActiveCampaign(campData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysToMyBday = calcDaysUntil(profile?.birthday);
  const firstName = profile?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || profile?.username || 'amigo';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const hasUpcomingFriend = upcomingFriends.length > 0;

  return (
    <div style={{ padding: isMobile ? '16px 20px 20px' : 0 }}>
      {/* Saludo */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, color: C.inkMuted, fontWeight: 500 }}>
          Hola, {capitalizedName} 👋
        </div>
        <h1 style={{
          fontSize: isMobile ? 28 : 42,
          fontWeight: 800,
          color: C.ink,
          margin: '4px 0 0',
          letterSpacing: isMobile ? -0.8 : -1.2,
          lineHeight: 1.15,
        }}>
          {hasUpcomingFriend
            ? (isMobile 
                ? <>Tu próximo cumple<br/>está cerca</> 
                : 'Tu próximo cumple está cerca')
            : (daysToMyBday !== null && daysToMyBday < 60
                ? `Tu cumple es en ${daysToMyBday} días`
                : '¡Bienvenido!')}
        </h1>
      </div>

      {/* Layout: dos columnas en desktop (hero + mi cumple), 
          Solo mi cumple si no hay amigos próximos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (hasUpcomingFriend ? '1.4fr 1fr' : '1fr 1fr'),
        gap: isMobile ? 0 : 20,
        marginBottom: isMobile ? 20 : 32,
      }}>
        {/* Hero card: próximo cumple amigo O Organizar cumple */}
        {hasUpcomingFriend ? (
          <HeroCard friend={upcomingFriends[0]} isMobile={isMobile} handleTabChange={handleTabChange} />
        ) : (
          <OrganizarCard isMobile={isMobile} onClick={() => handleTabChange('wizard')} />
        )}

        {/* Mi cumple - SIEMPRE se muestra, mobile y desktop */}
        {daysToMyBday !== null && (
          <MiCumpleMini days={daysToMyBday} isMobile={isMobile} onClick={() => handleTabChange('miregalo')} />
        )}
      </div>

      {/* Acciones rápidas */}
      <SectionTitle isMobile={isMobile}>Acciones rápidas</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 10 : 14,
        marginBottom: isMobile ? 24 : 40,
      }}>
        <QuickAction icon={Plus} label="Organizar cumple" desc="Para un amigo" color={C.primary} isMobile={isMobile} onClick={() => handleTabChange('wizard')} />
        <QuickAction icon={UserPlus} label="Invitar amigos" desc="Al link personal" color={C.accent} isMobile={isMobile} onClick={() => handleTabChange('compartir')} />
        <QuickAction icon={Gift} label="Mis regalos" desc="Aportes recibidos" color="#EC4899" isMobile={isMobile} onClick={() => handleTabChange('misregalos')} />
        <QuickAction icon={Gamepad2} label="Jugar" desc="Juegos de cumple" color="#10B981" isMobile={isMobile} />
      </div>

      {/* Próximos cumples */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: isMobile ? 12 : 16 }}>
        <SectionTitle isMobile={isMobile} noMargin>Próximos cumples</SectionTitle>
        <button 
          onClick={() => handleTabChange('explorar')}
          style={{
            background: 'none', border: 'none', color: C.primary,
            fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer',
          }}>
          Ver agenda {!isMobile && '→'}
        </button>
      </div>

      {upcomingFriends.length > 0 ? (
        <div style={isMobile ? {
          display: 'flex', gap: 12, overflowX: 'auto',
          margin: '0 -20px', padding: '0 20px 8px', scrollbarWidth: 'none',
        } : {
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
        }}>
          {upcomingFriends.slice(0, 4).map(f => (
            <FriendCard key={f.id} friend={f} isMobile={isMobile} onClick={() => handleTabChange('explorar')} />
          ))}
        </div>
      ) : (
        <EmptyState
          message={loading ? "Cargando amigos..." : "Aún no agregaste amigos"}
          cta="Agregar amigos"
          onClick={() => handleTabChange('explorar')}
        />
      )}
    </div>
  );
}

function HeroCard({ friend, isMobile, handleTabChange }) {
  const bg = `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`;
  return (
    <div style={{
      background: bg,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? 20 : 32,
      color: 'white', marginBottom: isMobile ? 20 : 0,
      position: 'relative', overflow: 'hidden',
      minHeight: isMobile ? 'auto' : 260,
    }}>
      <div style={{
        position: 'absolute', right: -20, top: -20,
        fontSize: isMobile ? 140 : 220, opacity: 0.15,
      }}>🎂</div>
      <div style={{
        fontSize: isMobile ? 11 : 12, fontWeight: 700,
        opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase',
        position: 'relative', zIndex: 1,
      }}>
        En {friend.days} día{friend.days !== 1 ? 's' : ''} · Organizás vos
      </div>
      <div style={{
        fontSize: isMobile ? 24 : 34, fontWeight: 800,
        marginTop: 6, letterSpacing: isMobile ? -0.4 : -0.8,
        position: 'relative', zIndex: 1,
      }}>
        Cumple de {friend.name?.split(' ')[0]}
      </div>
      <div style={{ fontSize: isMobile ? 13 : 14, opacity: 0.9, marginTop: 6, position: 'relative', zIndex: 1 }}>
        @{friend.username}
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(255,255,255,0.25)', height: 6, borderRadius: 4,
        marginTop: 14, overflow: 'hidden', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '56%', height: '100%', background: C.accent, borderRadius: 4 }} />
      </div>

      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginTop: isMobile ? 14 : 22, position: 'relative', zIndex: 1 }}>
        <button style={{
          flex: 1, padding: isMobile ? '10px 14px' : '12px 22px',
          borderRadius: 12, border: 'none',
          background: 'white', color: C.primary,
          fontWeight: 700, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
        }}>Compartir link</button>
        <button style={{
          padding: isMobile ? '10px 14px' : '12px 22px',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)',
          background: 'transparent', color: 'white',
          fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
        }} onClick={() => window.location.href = '/u/' + friend.username}>Ver regalo</button>
      </div>
    </div>
  );
}

function MiCumpleMini({ days, isMobile, onClick }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accent} 0%, #EC4899 100%)`,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? 22 : 28,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: isMobile ? 20 : 0,
      cursor: 'pointer',
    }} onClick={onClick}>
      <div style={{ 
        position: 'absolute', right: -20, bottom: -30, 
        fontSize: isMobile ? 100 : 130, opacity: 0.2 
      }}>🎁</div>
      <div style={{
        fontSize: isMobile ? 11 : 12, fontWeight: 700, opacity: 0.9,
        textTransform: 'uppercase', letterSpacing: 0.6,
        position: 'relative', zIndex: 1,
      }}>
        Mi cumpleaños
      </div>
      <div style={{
        fontSize: isMobile ? 56 : 64, fontWeight: 900, 
        letterSpacing: -2, lineHeight: 1, marginTop: 10,
        position: 'relative', zIndex: 1,
      }}>{days}</div>
      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, position: 'relative', zIndex: 1 }}>
        día{days !== 1 ? 's' : ''} para la fiesta
      </div>
      <button style={{
        marginTop: isMobile ? 16 : 20,
        padding: isMobile ? '8px 14px' : '10px 18px', 
        borderRadius: 12, border: 'none',
        background: 'white', color: '#EC4899',
        fontWeight: 700, fontSize: isMobile ? 12 : 13, cursor: 'pointer',
        position: 'relative', zIndex: 1,
      }}>Ver mi regalo →</button>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, color, isMobile, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'white', border: `1px solid ${C.border}`,
      borderRadius: isMobile ? 16 : 18,
      padding: isMobile ? 14 : 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', gap: isMobile ? 10 : 14,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 10 : 12,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={isMobile ? 18 : 22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.ink }}>{label}</div>
        {!isMobile && desc && (
          <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 2 }}>{desc}</div>
        )}
      </div>
    </button>
  );
}

function FriendCard({ friend, isMobile, onClick }) {
  return (
    <div onClick={onClick} style={{
      minWidth: isMobile ? 140 : 'auto',
      background: 'white', borderRadius: isMobile ? 16 : 18,
      padding: isMobile ? 14 : 18,
      border: `1px solid ${C.border}`,
      cursor: 'pointer',
    }}>
      {friend.avatar_url ? (
        <img src={friend.avatar_url} alt={friend.name} style={{
          width: isMobile ? 44 : 56, height: isMobile ? 44 : 56,
          borderRadius: '50%', objectFit: 'cover',
        }} />
      ) : (
        <div style={{
          width: isMobile ? 44 : 56, height: isMobile ? 44 : 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: isMobile ? 18 : 22,
        }}>{getInitial(friend.name)}</div>
      )}
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: C.ink, marginTop: isMobile ? 10 : 14 }}>
        {friend.name?.split(' ')[0]}
      </div>
      <div style={{ fontSize: isMobile ? 11 : 12, color: C.inkMuted, marginTop: 2 }}>
        en {friend.days} día{friend.days !== 1 ? 's' : ''}
      </div>
      {!isMobile && (
        <button style={{
          marginTop: 12, width: '100%', padding: 10, borderRadius: 10,
          border: `1px solid ${C.border}`, background: 'white', color: C.ink,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Regalar</button>
      )}
    </div>
  );
}

function SectionTitle({ children, isMobile, noMargin }) {
  return (
    <h3 style={{
      fontSize: isMobile ? 16 : 22,
      fontWeight: 800, color: C.ink,
      letterSpacing: isMobile ? -0.3 : -0.4,
      margin: noMargin ? 0 : `0 0 ${isMobile ? 12 : 16}px`,
    }}>{children}</h3>
  );
}

function EmptyState({ message, cta, onClick }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 24,
      border: `1px dashed ${C.border}`, textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 12 }}>{message}</div>
      <button onClick={onClick} style={{
        padding: '10px 20px', borderRadius: 12, border: 'none',
        background: C.primary, color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
      }}>{cta}</button>
    </div>
  );
}

function OrganizarCard({ isMobile, onClick }) {
  const bg = `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`;
  return (
    <div onClick={onClick} style={{
      background: bg,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? 20 : 32,
      color: 'white', marginBottom: isMobile ? 20 : 0,
      position: 'relative', overflow: 'hidden',
      minHeight: isMobile ? 'auto' : 260,
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', right: -20, top: -20,
        fontSize: isMobile ? 140 : 220, opacity: 0.15,
      }}>🎁</div>
      <div style={{
        fontSize: isMobile ? 11 : 12, fontWeight: 700,
        opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase',
        position: 'relative', zIndex: 1,
      }}>
        Sin cumples próximos
      </div>
      <div style={{
        fontSize: isMobile ? 24 : 34, fontWeight: 800,
        marginTop: 6, letterSpacing: isMobile ? -0.4 : -0.8,
        position: 'relative', zIndex: 1,
      }}>
        ¿Querés organizar el cumple de alguien?
      </div>
      <div style={{ fontSize: isMobile ? 13 : 14, opacity: 0.9, marginTop: 6, position: 'relative', zIndex: 1 }}>
        Sumáte a una colecta entre amigos
      </div>

      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginTop: isMobile ? 14 : 22, position: 'relative', zIndex: 1 }}>
        <button style={{
          flex: 1, padding: isMobile ? '10px 14px' : '12px 22px',
          borderRadius: 12, border: 'none',
          background: 'white', color: C.primary,
          fontWeight: 700, fontSize: isMobile ? 13 : 14, cursor: 'pointer',
        }}>Organizar regalo</button>
      </div>
    </div>
  );
}
