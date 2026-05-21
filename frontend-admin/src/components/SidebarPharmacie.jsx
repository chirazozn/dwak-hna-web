import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/dwakhnalogo.png';

const API      = 'https://dwak-hna-web.onrender.com/api/pharmacie';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const menuItems = [
  { icon: '📊', label: 'Dashboard',  path: '/pharmacie/dashboard' },
  { icon: '📋', label: 'Demandes',   path: '/pharmacie/demandes',  badge: true },
  { icon: '📦', label: 'Produits',   path: '/pharmacie/produits'  },
  { icon: '👤', label: 'Mon Profil', path: '/pharmacie/profil'    },
];

const playSound = () => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};

export default function SidebarPharmacie({ estApprouve, pharmacie }) {
  const navigate = useNavigate();

  const [nbDemandes, setNbDemandes] = useState(0);
  const [estOuvert,  setEstOuvert]  = useState(false);
  const [estDeGarde, setEstDeGarde] = useState(false);
  const [toggling,   setToggling]   = useState(false);

  const isFirstRef = useRef(true);
  const prevNbRef  = useRef(0);

 const fetchNotifs = async () => {
  if (!estApprouve) return;
  try {
    const res = await axios.get(`${API}/notifications`, { headers: headers() });
    const nb  = res.data.nb_demandes || 0;
    if (!isFirstRef.current && nb > prevNbRef.current) {
      playSound();
    }
    isFirstRef.current = false;
    prevNbRef.current  = nb;
    setNbDemandes(nb);
    // ✅ Pas de setLoading → pas de refresh visible
  } catch (e) { console.error(e); }
};

  useEffect(() => {
    if (pharmacie) {
      setEstOuvert(pharmacie.est_ouverte   || false);
      setEstDeGarde(pharmacie.est_de_garde || false);
    }
  }, [pharmacie]);

  useEffect(() => {
    isFirstRef.current = true;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [estApprouve]);

  const handleToggleOuvert = async () => {
    if (!estApprouve || toggling) return;
    setToggling(true);
    try {
      const res = await axios.put(`${API}/toggle-ouvert`, {}, { headers: headers() });
      setEstOuvert(res.data.est_ouverte);
    } catch (e) { console.error(e); }
    finally { setToggling(false); }
  };

  const handleToggleGarde = async () => {
    if (!estApprouve || toggling) return;
    setToggling(true);
    try {
      const res = await axios.put(`${API}/toggle-garde`, {}, { headers: headers() });
      setEstDeGarde(res.data.est_de_garde);
    } catch (e) { console.error(e); }
    finally { setToggling(false); }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside style={s.sidebar}>

      {/* LOGO */}
      <div style={s.logoWrap}>
        <img src={logo} alt="Dwak Hna" style={s.logo} />
        <div>
          <p style={s.appName}>Dwak Hna</p>
          <p style={s.appSub}>Espace Pharmacie</p>
        </div>
      </div>

      {/* TOGGLES OUVERT / GARDE */}
      <div style={{
        ...s.togglesWrap,
        opacity:       estApprouve ? 1 : 0.4,
        pointerEvents: estApprouve ? 'auto' : 'none',
      }}>
        {/* Ouvert / Fermé */}
        <button onClick={handleToggleOuvert} disabled={toggling} style={{
          ...s.toggleBtn,
          background:  estOuvert ? '#dcfce7' : '#fee2e2',
          borderColor: estOuvert ? '#86efac' : '#fca5a5',
        }}>
          <span style={{ fontSize: 20 }}>{estOuvert ? '🟢' : '🔴'}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ ...s.toggleLabel, color: estOuvert ? '#15803d' : '#dc2626' }}>
              {estOuvert ? 'Ouverte' : 'Fermée'}
            </p>
            <p style={s.toggleSub}>Cliquer pour changer</p>
          </div>
        </button>

        {/* De garde */}
        <button onClick={handleToggleGarde} disabled={toggling} style={{
          ...s.toggleBtn,
          background:  estDeGarde ? '#fef3c7' : '#f8fafc',
          borderColor: estDeGarde ? '#fcd34d' : '#e5e7eb',
        }}>
          <span style={{ fontSize: 20 }}>{estDeGarde ? '⭐' : '☆'}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ ...s.toggleLabel, color: estDeGarde ? '#d97706' : '#6b7280' }}>
              {estDeGarde ? 'De garde' : 'Pas de garde'}
            </p>
            <p style={s.toggleSub}>Cliquer pour changer</p>
          </div>
        </button>
      </div>

      {/* MENU */}
      <nav style={s.nav}>
        {menuItems.map(item => {
          if (!estApprouve) {
            return (
              <div key={item.path} style={s.linkLocked} title="Compte non approuvé">
                <span style={s.icon}>{item.icon}</span>
                <span style={{ ...s.label, color: '#d1d5db' }}>{item.label}</span>
                <span style={{ fontSize: 14 }}>🔒</span>
              </div>
            );
          }
          return (
            <NavLink key={item.path} to={item.path}
              style={({ isActive }) => ({
                ...s.link,
                ...(isActive ? s.linkActive : {}),
              })}>
              <span style={s.icon}>{item.icon}</span>
              <span style={s.label}>{item.label}</span>
              {item.badge && nbDemandes > 0 && (
                <span style={s.badge}>{nbDemandes}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <button onClick={logout} style={s.logoutBtn}>
        🚪 Déconnexion
      </button>

      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.15); }
        }
      `}</style>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 260, height: '100vh', background: '#fff',
    borderRight: '1px solid #e5e7eb', position: 'fixed',
    top: 0, left: 0, display: 'flex', flexDirection: 'column',
    zIndex: 100, boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
    fontFamily: "'Inter', sans-serif",
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 16px', borderBottom: '1px solid #f3f4f6',
  },
  logo:   { width: 36, height: 36, objectFit: 'contain' },
  appName:{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 },
  appSub: { fontSize: 11, color: '#008339', fontWeight: 600, margin: 0 },

  togglesWrap: {
    padding: '12px', display: 'flex',
    flexDirection: 'column', gap: 8,
    borderBottom: '1px solid #f3f4f6',
    transition: 'opacity 0.3s',
  },
  toggleBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.2s',
    width: '100%',
  },
  toggleLabel: { fontSize: 13, fontWeight: 700, margin: 0 },
  toggleSub:   { fontSize: 10, color: '#9ca3af', margin: 0 },

  nav: {
    flex: 1, overflowY: 'auto', padding: '10px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', borderRadius: 10,
    textDecoration: 'none', color: '#6b7280',
    fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
  },
  linkActive: { background: '#e6f4ec', color: '#008339', fontWeight: 700 },
  linkLocked: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', borderRadius: 10,
    color: '#d1d5db', fontSize: 14, fontWeight: 500,
    cursor: 'not-allowed',
  },
  icon:  { fontSize: 18, flexShrink: 0 },
  label: { flex: 1 },
  badge: {
    background: '#ef4444', color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '2px 7px', borderRadius: 20,
    minWidth: 20, textAlign: 'center',
    animation: 'badgePulse 1.5s infinite',
  },
  logoutBtn: {
    margin: '12px', padding: '12px',
    background: 'transparent', border: '1.5px solid #e5e7eb',
    borderRadius: 10, color: '#6b7280', fontSize: 14,
    fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  },
};
