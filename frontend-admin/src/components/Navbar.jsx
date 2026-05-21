import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/dwakhnalogo.png';

export default function Navbar({ title = '', isMobile = false, onMenuClick }) {
  const navigate = useNavigate();
  const nom  = localStorage.getItem('nom')  || 'Admin';
  const role = localStorage.getItem('role') || 'admin';

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const goToProfil = () => {
    if (role === 'admin') navigate('/admin/profil');
    else navigate('/pharmacie/profil');
  };

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <header style={{ ...s.navbar, left: 0, padding: '0 16px' }}>
        <button onClick={onMenuClick} style={s.hamburger} aria-label="Ouvrir le menu">
          ☰
        </button>
        <img src={logo} alt="Dwak Hna" style={s.mobileLogo} />
        <button onClick={logout} style={s.avatarBtn} aria-label="Déconnexion" title="Déconnexion">
          {nom.charAt(0).toUpperCase()}
        </button>
      </header>
    );
  }

  /* ── Desktop ── */
  return (
    <header style={{ ...s.navbar, left: '260px', padding: '0 32px' }}>
      <h2 style={s.title}>{title}</h2>

      <div style={s.right}>
        {/* Avatar + Nom → clique vers profil */}
        <div style={s.profilBox} onClick={goToProfil}>
          <div style={s.avatarCircle}>
            {nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={s.name}>{nom}</p>
            <p style={s.profilLink}>
              {role === 'admin' ? 'Administrateur' : 'Pharmacie'}
              {' · '}
              <span style={{ color: '#008339' }}>Mon profil →</span>
            </p>
          </div>
        </div>

        {/* Bouton déconnexion */}
        <button onClick={logout} style={s.logoutBtn}>
          🚪 Déconnexion
        </button>
      </div>
    </header>
  );
}

const s = {
  navbar: {
    position: 'fixed', top: 0, right: 0,
    height: '70px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    zIndex: 300,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /* Mobile */
  hamburger: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '24px', color: '#1f2937',
    padding: '6px 8px', borderRadius: '8px',
    lineHeight: 1, flexShrink: 0,
  },
  mobileLogo: {
    position: 'absolute', left: '50%',
    transform: 'translateX(-50%)',
    height: '38px', width: 'auto',
    pointerEvents: 'none',
  },
  avatarBtn: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: '#008339', color: '#fff', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px', cursor: 'pointer', flexShrink: 0,
  },

  /* Desktop */
  title: { fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 },
  right: { display: 'flex', alignItems: 'center', gap: '16px' },

  profilBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    cursor: 'pointer', padding: '6px 10px', borderRadius: '10px',
    transition: 'background 0.15s',
  },
  avatarCircle: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: '#008339', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px', flexShrink: 0,
  },
  name: { fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 },
  profilLink: { fontSize: '11px', color: '#6b7280', margin: 0, marginTop: '2px' },

  logoutBtn: {
    padding: '8px 16px', background: 'transparent',
    border: '1.5px solid #e5e7eb', borderRadius: '8px',
    fontSize: '13px', color: '#6b7280', cursor: 'pointer',
    fontWeight: '500', whiteSpace: 'nowrap',
  },
};
