import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/dwakhnalogo.png';
import axios from 'axios';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const menuItems = [
  { icon: '📊', label: 'Dashboard',     path: '/admin/dashboard'    },
  { icon: '👥', label: 'Patients',      path: '/admin/patients'     },
  { icon: '🏥', label: 'Pharmacies',    path: '/admin/pharmacies',  badge: 'pharmacies_en_attente' },
  { icon: '🛒', label: 'Commandes', path: '/admin/commandes', badge: true },
  { icon: '💊', label: 'Médicaments',   path: '/admin/medicaments'  },
  { icon: '📦', label: 'Produits',      path: '/admin/produits'     },
  { icon: '🤝', label: 'Partenaires',   path: '/admin/partenaires'  },
  { icon: '📢', label: 'Publicités',    path: '/admin/publicites'   },
  { icon: '🔔', label: 'Notifications', path: '/admin/notifications'},
  { icon: '📋', label: 'Demandes',      path: '/admin/demandes'     },
  { icon: '💬', label: 'Messages',      path: '/admin/messages'     },
  { icon: '👤', label: 'Mon Profil',    path: '/admin/profil'       },
];

// Son notification
const playNotifSound = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
};

export default function Sidebar() {
  const navigate = useNavigate();
  const [badges,      setBadges]      = useState({ pharmacies_en_attente: 0 });
 const prevBadgeRef  = useRef(-1); // -1 = premier fetch, pas de son
const isFirstFetch  = useRef(true);

const fetchBadges = async () => {
  try {
    const res   = await axios.get(`${API}/stats`, { headers: headers() });
    const count = res.data.stats?.pharmacies_en_attente || 0;

    // Son uniquement si pas le premier fetch ET si count a augmenté
    if (!isFirstFetch.current && count > prevBadgeRef.current) {
      playNotifSound();
    }

    isFirstFetch.current  = false;
    prevBadgeRef.current  = count;
    setBadges({ pharmacies_en_attente: count });
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchBadges();
    // Refresh toutes les 15 secondes
    const interval = setInterval(fetchBadges, 15000);

    // Écoute l'event "pharmacie-action" déclenché depuis Pharmacies.jsx
    const handler = () => fetchBadges();
    window.addEventListener('pharmacie-action', handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pharmacie-action', handler);
    };
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside style={s.sidebar}>
      {/* LOGO */}
      <div style={s.logoWrap}>
        <img src={logo} alt="Dwak Hna" style={s.logo} />
        <span style={s.appName}>Dwak Hna</span>
        <span style={s.adminBadge}>Admin</span>
      </div>

      {/* MENU */}
      <nav style={s.nav}>
        {menuItems.map(item => {
          const badgeCount = item.badge ? badges[item.badge] : 0;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...s.link,
                ...(isActive ? s.linkActive : {}),
              })}
            >
              <span style={s.icon}>{item.icon}</span>
              <span style={s.label}>{item.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  ...s.badge,
                  animation: 'badgePulse 1.5s infinite',
                }}>
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1);    opacity: 1;   }
          50%       { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* LOGOUT */}
      <button onClick={logout} style={s.logoutBtn}>
        🚪 Déconnexion
      </button>
    </aside>
  );
}

const s = {
  sidebar: {
    width: '260px', height: '100vh', background: '#fff',
    borderRight: '1px solid #e5e7eb', position: 'fixed',
    top: 0, left: 0, display: 'flex', flexDirection: 'column',
    zIndex: 100, boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '24px 20px 20px', borderBottom: '1px solid #f3f4f6',
  },
  logo:       { width: 36, height: 36, objectFit: 'contain' },
  appName:    { fontSize: 16, fontWeight: 700, color: '#1f2937', flex: 1 },
  adminBadge: { fontSize: 10, fontWeight: 700, background: '#008339', color: '#fff', padding: '2px 8px', borderRadius: 20 },
  nav: {
    flex: 1, overflowY: 'auto', padding: '12px 12px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', borderRadius: 10, textDecoration: 'none',
    color: '#6b7280', fontSize: 14, fontWeight: 500,
    transition: 'all 0.15s', position: 'relative',
  },
  linkActive: { background: '#e6f4ec', color: '#008339', fontWeight: 700 },
  icon:       { fontSize: 18, flexShrink: 0 },
  label:      { flex: 1 },
  badge: {
    background: '#ef4444', color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '2px 7px', borderRadius: 20,
    minWidth: 20, textAlign: 'center',
  },
  logoutBtn: {
    margin: '12px', padding: '12px', background: 'transparent',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    color: '#6b7280', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  },
};
