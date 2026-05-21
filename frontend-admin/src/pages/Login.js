import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/dwakhnalogo.png';
import bgImage from '../assets/pharmacy-bg.png'; // ton image


export default function Login() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [forgotStep,    setForgotStep]    = useState(0);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotCode,    setForgotCode]    = useState('');
  const [newPass,       setNewPass]       = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg,     setForgotMsg]     = useState({ text: '', type: '' });

  const showForgotMsg = (text, type) => {
    setForgotMsg({ text, type });
    setTimeout(() => setForgotMsg({ text: '', type: '' }), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/login', {
        email, mot_de_passe: password
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role',  res.data.role);
      localStorage.setItem('nom',   res.data.nom);
      navigate(res.data.redirect);
    } catch (err) {
      const statut = err.response?.data?.statut;
      const msg    = err.response?.data?.message || 'Email ou mot de passe incorrect';
      if (err.response?.status === 403 && statut === 'en_attente') {
        localStorage.setItem('pending_email', err.response.data.email || email);
        localStorage.setItem('pending_pass',  password);
        navigate('/pharmacie/en-attente', { state: { email: err.response.data.email || email, password } });
        return;
      }
      if (err.response?.status === 403 && statut === 'suspendue') {
        setError('🚫 Votre compte a été suspendu. Contactez l\'administration.');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSend = async () => {
    if (!forgotEmail) { showForgotMsg('Email obligatoire', 'error'); return; }
    setForgotLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/forgot-password', { email: forgotEmail });
      showForgotMsg(res.data.message, 'success');
      setForgotStep(2);
    } catch (err) {
      showForgotMsg(err.response?.data?.message || 'Email introuvable', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (forgotCode.length !== 6) { showForgotMsg('Code à 6 chiffres requis', 'error');               return; }
    if (newPass.length < 6)      { showForgotMsg('Minimum 6 caractères', 'error');                    return; }
    if (newPass !== confirmPass)  { showForgotMsg('Les mots de passe ne correspondent pas', 'error'); return; }
    setForgotLoading(true);
    try {
      await axios.post('http://127.0.0.1:5000/api/reset-password', {
        email: forgotEmail, code: forgotCode, new_password: newPass,
      });
      showForgotMsg('Mot de passe réinitialisé ! Connectez-vous.', 'success');
      setTimeout(() => {
        setForgotStep(0); setForgotEmail(''); setForgotCode(''); setNewPass(''); setConfirmPass('');
      }, 2000);
    } catch (err) {
      showForgotMsg(err.response?.data?.message || 'Code incorrect', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={s.page}>

      {/* PARTIE GAUCHE — décorative */}
      <div style={s.left}>
        <div style={s.leftContent}>
          <div style={s.leftLogo}>
            <img src={logo} alt="Dwak Hna" style={{ width: 120, height: 120, objectFit: 'contain'  }} />
          </div>
          <p style={s.leftSub}>Plateforme de gestion pharmacie</p>

          <div style={s.features}>
            {[
              { icon: '🏥', text: 'Gérez votre pharmacie en ligne' },
              { icon: '📋', text: 'Répondez aux demandes patients' },
              { icon: '📦', text: 'Gérez votre catalogue produits' },
              { icon: '📊', text: 'Suivez vos statistiques en temps réel' },
            ].map((f, i) => (
              <div key={i} style={s.featureItem}>
                <span style={s.featureIcon}>{f.icon}</span>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cercles décoratifs */}
        <div style={{ ...s.circle, width: 300, height: 300, bottom: -80, right: -80, opacity: 0.08 }} />
        <div style={{ ...s.circle, width: 180, height: 180, top: 40, right: 40, opacity: 0.06 }} />
      </div>

      {/* PARTIE DROITE — formulaire */}
      <div style={s.right}>
        <div style={s.card}>

          {/* Logo mobile */}
          <div style={s.mobileLogo}>
            <img src={logo} alt="Dwak Hna" style={{ width: 52 }} />
          </div>

          {/* Titre */}
          <h2 style={s.cardTitle}>
            {forgotStep === 0 ? 'Connexion' : 'Mot de passe oublié'}
          </h2>
          <p style={s.cardSub}>
            {forgotStep === 0
              ? 'Connectez-vous à votre espace professionnel'
              : forgotStep === 1
                ? 'Entrez votre email pour recevoir un code'
                : 'Entrez le code reçu et choisissez un nouveau mot de passe'}
          </p>

          {/* ── LOGIN ── */}
          {forgotStep === 0 && (
            <>
              {error && (
                <div style={s.alertError}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={s.formGroup}>
                  <label style={s.label}>Adresse email</label>
                  <div style={s.inputWrap}>
                    <span style={s.inputIcon}>✉️</span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={s.input}
                      placeholder="votre@email.dz"
                      required
                    />
                  </div>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Mot de passe</label>
                  <div style={s.inputWrap}>
                    <span style={s.inputIcon}>🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ ...s.input, paddingRight: 44 }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={s.eyeBtn}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <button type="button" onClick={() => setForgotStep(1)} style={s.forgotLink}>
                    Mot de passe oublié ?
                  </button>
                </div>

                <button
                  type="submit"
                  style={{ ...s.btnPrimary, opacity: loading ? 0.75 : 1 }}
                  disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={s.spinner} /> Connexion...
                    </span>
                  ) : 'Se connecter →'}
                </button>
              </form>

              <div style={s.divider}>
                <div style={s.dividerLine} />
                <span style={s.dividerText}>Nouveau sur Dwak Hna ?</span>
                <div style={s.dividerLine} />
              </div>

              <button
                onClick={() => navigate('/pharmacie/register')}
                style={s.btnSecondary}>
                🏥 Créer un compte pharmacie
              </button>
            </>
          )}

          {/* ── FORGOT étape 1 ── */}
          {forgotStep === 1 && (
            <>
              {forgotMsg.text && (
                <div style={{ ...s.alertError, ...(forgotMsg.type === 'success' ? s.alertSuccess : {}) }}>
                  {forgotMsg.type === 'success' ? '✅' : '⚠️'} {forgotMsg.text}
                </div>
              )}

              <div style={s.formGroup}>
                <label style={s.label}>Votre email</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>✉️</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    style={s.input}
                    placeholder="votre@email.dz"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleForgotSend}
                style={{ ...s.btnPrimary, opacity: forgotLoading ? 0.75 : 1 }}
                disabled={forgotLoading}>
                {forgotLoading ? 'Envoi...' : '📨 Envoyer le code'}
              </button>

              <button onClick={() => setForgotStep(0)} style={s.btnBack}>
                ← Retour à la connexion
              </button>
            </>
          )}

          {/* ── FORGOT étape 2 ── */}
          {forgotStep === 2 && (
            <>
              {forgotMsg.text && (
                <div style={{ ...s.alertError, ...(forgotMsg.type === 'success' ? s.alertSuccess : {}) }}>
                  {forgotMsg.type === 'success' ? '✅' : '⚠️'} {forgotMsg.text}
                </div>
              )}

              <div style={s.emailBadge}>
                📨 Code envoyé à <strong>{forgotEmail}</strong>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Code à 6 chiffres</label>
                <input
                  type="text"
                  value={forgotCode}
                  onChange={e => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ ...s.input, textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 700, paddingLeft: 0 }}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Nouveau mot de passe</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🔒</span>
                  <input
                    type="password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    style={s.input}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Confirmer le mot de passe</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🔒</span>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    style={s.input}
                    placeholder="Répétez le mot de passe"
                  />
                </div>
                {confirmPass.length > 0 && (
                  <p style={{ fontSize: 12, marginTop: 4, color: confirmPass === newPass ? '#008339' : '#ef4444' }}>
                    {confirmPass === newPass ? '✅ Mots de passe identiques' : '❌ Mots de passe différents'}
                  </p>
                )}
              </div>

              <button
                onClick={handleForgotReset}
                style={{ ...s.btnPrimary, opacity: forgotLoading ? 0.75 : 1 }}
                disabled={forgotLoading}>
                {forgotLoading ? 'Vérification...' : '✅ Réinitialiser le mot de passe'}
              </button>

              <button onClick={() => setForgotStep(1)} style={s.btnBack}>
                ← Retour
              </button>
            </>
          )}

          <p style={s.footer}>Dwak Hna © 2026 · Tous droits réservés</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    display: 'flex', minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },

  // ── GAUCHE ──
  left: {
    flex: 1,  backgroundImage: `url(${bgImage})`,backgroundSize: 'cover',
  backgroundPosition: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '60px 48px', position: 'relative', overflow: 'hidden',
    // Masqué sur petits écrans
    minWidth: 420,
  },
  leftContent: { position: 'relative', zIndex: 2, maxWidth: 400 },
 leftLogo: {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 24,
},
  leftTitle: { fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 8px' },
leftSub: { 
  fontSize: 16, 
  color: 'rgba(255,255,255,0.75)', 
  margin: '0 0 48px', 
  textAlign: 'center' 
},
  features:     { display: 'flex', flexDirection: 'column', gap: 20 },
  featureItem:  { display: 'flex', alignItems: 'center', gap: 14 },
  featureIcon:  {
    width: 44, height: 44, background: 'rgba(255,255,255,0.12)',
    borderRadius: 12, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 20, flexShrink: 0,
  },
  featureText:  { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 500 },

  circle: {
    position: 'absolute', borderRadius: '50%',
    background: '#fff', pointerEvents: 'none',
  },

  // ── DROITE ──
  right: {
    width: 480, background: '#f8fafc',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 32px',
  },
  card: { width: '100%', maxWidth: 400 },

  mobileLogo: { display: 'none', marginBottom: 24, textAlign: 'center' },

  cardTitle: { fontSize: 28, fontWeight: 800, color: '#1f2937', margin: '0 0 6px' },
  cardSub:   { fontSize: 14, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.5 },

  alertError: {
    background: '#fee2e2', color: '#dc2626',
    padding: '12px 16px', borderRadius: 10,
    marginBottom: 20, fontSize: 14, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 8,
    border: '1px solid #fca5a5',
  },
  alertSuccess: {
    background: '#dcfce7', color: '#15803d',
    border: '1px solid #86efac',
  },

  formGroup: { marginBottom: 20 },
  label:     { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 },

  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 14, fontSize: 16,
    pointerEvents: 'none', zIndex: 1,
  },
  input: {
    width: '100%', padding: '13px 14px 13px 44px',
    border: '1.5px solid #e5e7eb', borderRadius: 12,
    fontSize: 15, outline: 'none', color: '#1f2937',
    background: '#fff', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute', right: 12,
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 16, padding: 4,
    color: '#6b7280',
  },

  btnPrimary: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #008339 0%, #006128 100%)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.2s', letterSpacing: '0.3px',
    boxShadow: '0 4px 14px rgba(0,131,57,0.35)',
  },
  btnSecondary: {
    width: '100%', padding: '13px',
    background: '#fff', color: '#008339',
    border: '2px solid #008339', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.2s',
  },

  forgotLink: {
    background: 'none', border: 'none',
    color: '#008339', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
  },
  btnBack: {
    width: '100%', marginTop: 12, padding: '12px',
    background: 'transparent', border: '1.5px solid #e5e7eb',
    borderRadius: 12, color: '#6b7280', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
  },

  divider: {
    display: 'flex', alignItems: 'center',
    gap: 12, margin: '24px 0',
  },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', fontWeight: 500 },

  emailBadge: {
    background: '#e6f4ec', color: '#008339',
    padding: '12px 16px', borderRadius: 10,
    fontSize: 13, fontWeight: 500, marginBottom: 20,
    textAlign: 'center', border: '1px solid #bbf7d0',
  },

  spinner: {
    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },

  footer: {
    marginTop: 32, fontSize: 12,
    color: '#9ca3af', textAlign: 'center',
  },
};