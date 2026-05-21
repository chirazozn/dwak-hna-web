import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/dwakhnalogo.png';

const API = 'https://dwak-hna-web.onrender.com/api';

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

export default function EnAttente() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = location.state?.email    || localStorage.getItem('pending_email');
  const password  = location.state?.password || localStorage.getItem('pending_pass');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (location.state?.email)    localStorage.setItem('pending_email', location.state.email);
    if (location.state?.password) localStorage.setItem('pending_pass',  location.state.password);

    // Animation dots
    const dotsInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    // Polling approbation toutes les 5s
    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/pharmacie/check-statut`, {
          params: { email }
        });
        if (res.data.statut === 'approuvee') {
          clearInterval(pollInterval);
          clearInterval(dotsInterval);

          // Login maintenant possible
          const loginRes = await axios.post(`${API}/login`, {
            email,
            mot_de_passe: password,
          });
          localStorage.setItem('token', loginRes.data.token);
          localStorage.setItem('role',  loginRes.data.role);
          localStorage.setItem('nom',   loginRes.data.nom);
          localStorage.removeItem('pending_email');
          localStorage.removeItem('pending_pass');

          playSound();
          navigate('/pharmacie/dashboard');
        }
      } catch (e) { console.error(e); }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src={logo} alt="Dwak Hna" style={s.logo} />

        {/* Icône animée */}
        <div style={s.iconWrap}>
          <div style={s.iconBg}>⏳</div>
        </div>

        <h1 style={s.title}>Compte en attente</h1>
        <p style={s.subtitle}>
          Votre email a été confirmé avec succès ✅
        </p>

        <div style={s.infoBox}>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>📧</span>
            <span style={s.infoText}>{email}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>🔍</span>
            <span style={s.infoText}>Vérification des documents en cours</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>✅</span>
            <span style={s.infoText}>Redirection automatique après approbation</span>
          </div>
        </div>

        {/* Animation attente */}
        <div style={s.waitingBox}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#008339',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: `${delay}s`,
              }} />
            ))}
          </div>
          <p style={s.waitingText}>
            En attente d'approbation{dots}
          </p>
          <p style={s.waitingSubtext}>Vérification toutes les 5 secondes</p>
        </div>

        <button
          onClick={() => navigate('/login')}
          style={s.btnBack}
        >
          ← Retour à la connexion
        </button>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0);  }
            40%           { transform: scale(1.0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1);    }
            50%       { transform: scale(1.08); }
          }
        `}</style>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #008339 0%, #006128 100%)',
    padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 24,
    padding: '44px 36px', width: '100%', maxWidth: 440,
    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
    textAlign: 'center',
  },
  logo: { width: 70, margin: '0 auto 20px', display: 'block' },

  iconWrap: { marginBottom: 20 },
  iconBg:   {
    width: 80, height: 80, borderRadius: '50%',
    background: '#e6f4ec', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 40, margin: '0 auto',
    animation: 'pulse 2s infinite',
  },

  title:    { fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  infoBox: {
    background: '#f8fafc', borderRadius: 12,
    padding: '16px 20px', marginBottom: 24,
    display: 'flex', flexDirection: 'column', gap: 10,
    textAlign: 'left',
  },
  infoRow:  { display: 'flex', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 18, flexShrink: 0 },
  infoText: { fontSize: 13, color: '#374151', fontWeight: 500 },

  waitingBox: {
    background: '#e6f4ec', borderRadius: 12,
    padding: '20px', marginBottom: 24,
  },
  waitingText:    { fontSize: 15, fontWeight: 700, color: '#008339', margin: '0 0 4px' },
  waitingSubtext: { fontSize: 12, color: '#6b7280', margin: 0 },

  btnBack: {
    width: '100%', padding: '12px',
    background: 'transparent', color: '#6b7280',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
