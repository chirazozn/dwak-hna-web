import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API      = 'https://dwak-hna-web.onrender.com/api/pharmacie';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const playSound = () => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};

export default function NavbarPharmacie({ pharmacie, estApprouve, title = 'Dashboard' }) {
  const navigate = useNavigate();
  const nom = pharmacie?.nom || localStorage.getItem('nom') || 'Pharmacie';

  const [notifs,       setNotifs]       = useState([]);
  const [nbNonLues,    setNbNonLues]    = useState(0);
  const [nbDemandes,   setNbDemandes]   = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);
  const prevNbRef   = useRef(0);
  const isFirstRef  = useRef(true);
  const pollRef     = useRef(null);

  // Fermer dropdown si clic dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifs = async () => {
    if (!estApprouve) return;
    try {
      const res        = await axios.get(`${API}/notifications`, { headers: headers() });
      const notifsList = res.data.notifications || [];
      const nbNL       = res.data.nb_non_lues   || 0;
      const nbD        = res.data.nb_demandes    || 0;
      const total      = nbNL + nbD;

      if (!isFirstRef.current && total > prevNbRef.current) {
        playSound();
      }
      isFirstRef.current = false;
      prevNbRef.current  = total;

      setNotifs(notifsList);
      setNbNonLues(nbNL);
      setNbDemandes(nbD);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    isFirstRef.current = true;
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 5000);
    return () => clearInterval(pollRef.current);
  }, [estApprouve]);

  const handleMarquerLue = async (notif_id) => {
    try {
      await axios.put(`${API}/notifications/${notif_id}/lire`, {}, { headers: headers() });
      setNotifs(prev => prev.map(n => n.id === notif_id ? { ...n, est_lue: true } : n));
      setNbNonLues(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleMarquerToutesLues = async () => {
    try {
      const nonLues = notifs.filter(n => !n.est_lue);
      await Promise.all(
        nonLues.map(n => axios.put(`${API}/notifications/${n.id}/lire`, {}, { headers: headers() }))
      );
      setNotifs(prev => prev.map(n => ({ ...n, est_lue: true })));
      setNbNonLues(0);
    } catch (e) { console.error(e); }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const totalBadge = nbNonLues + nbDemandes;

  return (
    <header style={s.navbar}>
      <h2 style={s.title}>{title}</h2>

      <div style={s.right}>

        {/* Badge statut si pas approuvé */}
        {!estApprouve && (
          <div style={{
            ...s.statusBadge,
            background:  pharmacie?.statut === 'suspendue' ? '#fee2e2' : '#fef3c7',
            color:       pharmacie?.statut === 'suspendue' ? '#dc2626' : '#d97706',
            borderColor: pharmacie?.statut === 'suspendue' ? '#fca5a5' : '#fcd34d',
          }}>
            {pharmacie?.statut === 'suspendue' ? '🚫 Compte suspendu' : "⏳ En attente d'approbation"}
          </div>
        )}

        {/* 🔔 ICÔNE NOTIFICATIONS */}
        {estApprouve && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(prev => !prev)}
              style={{
                ...s.notifBtn,
                background: showDropdown ? '#e6f4ec' : '#f3f4f6',
              }}>
              🔔
              {totalBadge > 0 && (
                <span style={s.notifBadge}>
                  {totalBadge > 99 ? '99+' : totalBadge}
                </span>
              )}
            </button>

            {/* ── DROPDOWN ── */}
            {showDropdown && (
              <div style={s.dropdown}>

                {/* Header */}
                <div style={s.dropdownHeader}>
                  <span style={s.dropdownTitle}>🔔 Notifications</span>
                  {notifs.some(n => !n.est_lue) && (
                    <button onClick={handleMarquerToutesLues} style={s.btnToutesLues}>
                      Tout marquer lu
                    </button>
                  )}
                </div>

                <div style={s.dropdownList}>

                  {/* ── Section demandes en attente ── */}
                  {nbDemandes > 0 && (
                    <div
                      onClick={() => { navigate('/pharmacie/demandes'); setShowDropdown(false); }}
                      style={{
                        ...s.notifItem,
                        background: '#fef3c7',
                        borderLeft: '3px solid #d97706',
                        cursor: 'pointer',
                      }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
                          📋 {nbDemandes} nouvelle{nbDemandes > 1 ? 's' : ''} demande{nbDemandes > 1 ? 's' : ''} en attente
                        </p>
                        <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>
                          Cliquer pour répondre →
                        </p>
                      </div>
                      <span style={{ ...s.dotNonLue, background: '#d97706' }} />
                    </div>
                  )}

                  {/* Séparateur */}
                  {nbDemandes > 0 && notifs.length > 0 && (
                    <div style={s.separator}>
                      <span style={s.separatorText}>Notifications admin</span>
                    </div>
                  )}

                  {/* ── Notifs admin ── */}
                  {notifs.length === 0 && nbDemandes === 0 ? (
                    <div style={s.dropdownEmpty}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                      <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
                        Aucune notification
                      </p>
                    </div>
                  ) : notifs.length === 0 && nbDemandes > 0 ? null : (
                    notifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => !n.est_lue && handleMarquerLue(n.id)}
                        style={{
                          ...s.notifItem,
                          background:  n.est_lue ? '#fff'    : '#f0fdf4',
                          borderLeft:  n.est_lue ? '3px solid transparent' : '3px solid #008339',
                          cursor:      n.est_lue ? 'default' : 'pointer',
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <p style={{
                              fontSize: 13,
                              fontWeight: n.est_lue ? 500 : 700,
                              color: '#1f2937',
                              margin: '0 0 4px',
                              flex: 1,
                            }}>
                              {n.titre}
                            </p>
                            {!n.est_lue && <span style={s.dotNonLue} />}
                          </div>
                          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px', lineHeight: 1.4 }}>
                            {n.corps}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                            {n.date}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avatar */}
        <div
          style={{ ...s.avatarWrap, cursor: estApprouve ? 'pointer' : 'default' }}
          onClick={() => estApprouve && navigate('/pharmacie/profil')}>
          <div style={s.avatarCircle}>
            {nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={s.nom}>{nom}</p>
            <p style={s.role}>
              Pharmacie
              {estApprouve && <span style={{ color: '#008339' }}> · Mon profil →</span>}
            </p>
          </div>
        </div>

        {/* Déconnexion */}
        <button onClick={logout} style={s.logoutBtn}>
          🚪 Déconnexion
        </button>
      </div>

      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.2);  }
        }
      `}</style>
    </header>
  );
}

const s = {
  navbar: {
    position: 'fixed', top: 0, right: 0, left: 260,
    height: 70, background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', zIndex: 99,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    fontFamily: "'Inter', sans-serif",
  },
  title: { fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },

  statusBadge: {
    padding: '6px 14px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, border: '1px solid',
  },

  notifBtn: {
    position: 'relative', width: 42, height: 42,
    borderRadius: '50%', border: 'none', cursor: 'pointer',
    fontSize: 18, display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'background 0.2s',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    background: '#ef4444', color: '#fff',
    fontSize: 10, fontWeight: 700,
    padding: '2px 5px', borderRadius: 20,
    minWidth: 18, textAlign: 'center',
    border: '2px solid #fff',
    animation: 'badgePulse 1.5s infinite',
  },

  dropdown: {
    position: 'absolute', top: 52, right: 0,
    width: 370, background: '#fff',
    borderRadius: 16, zIndex: 300,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
    background: '#f8fafc',
  },
  dropdownTitle:  { fontSize: 14, fontWeight: 700, color: '#1f2937' },
  btnToutesLues:  { fontSize: 12, color: '#008339', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },

  dropdownList:  { maxHeight: 400, overflowY: 'auto' },
  dropdownEmpty: { padding: '40px 20px', textAlign: 'center' },

  separator:     { padding: '6px 16px', background: '#f8fafc', borderBottom: '1px solid #f3f4f6' },
  separatorText: { fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },

  notifItem: {
    padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
    display: 'flex', gap: 10, transition: 'background 0.15s',
  },
  dotNonLue: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#008339', flexShrink: 0, marginTop: 4,
  },

  avatarWrap:   { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 10 },
  avatarCircle: { width: 38, height: 38, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 },
  nom:          { fontSize: 14, fontWeight: 600, color: '#1f2937', margin: 0 },
  role:         { fontSize: 11, color: '#6b7280', margin: 0, marginTop: 2 },

  logoutBtn: {
    padding: '8px 16px', background: 'transparent',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, color: '#6b7280', cursor: 'pointer',
    fontWeight: 500, whiteSpace: 'nowrap',
  },
};
