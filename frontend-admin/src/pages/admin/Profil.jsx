import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AdminProfil() {
  const [admin,         setAdmin]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ text: '', type: '' });

  // Nom
  const [editNom,       setEditNom]       = useState(false);
  const [newNom,        setNewNom]        = useState('');

  // Email
  const [emailStep,     setEmailStep]     = useState(0);
  const [newEmail,      setNewEmail]      = useState('');
  const [emailCode,     setEmailCode]     = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [emailTimer,    setEmailTimer]    = useState(0);
  const [emailInterval, setEmailInterval] = useState(null);

  // Password
  const [passStep,      setPassStep]      = useState(0);
  const [passCode,      setPassCode]      = useState('');
  const [newPass,       setNewPass]       = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [passLoading,   setPassLoading]   = useState(false);
  const [passTimer,     setPassTimer]     = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => { fetchProfil(); }, []);

  const fetchProfil = async () => {
    try {
      const res = await axios.get(`${API}/profil`, { headers: headers() });
      setAdmin(res.data.admin);
      setNewNom(res.data.admin.nom);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text, type) => setToast({ text, type });

  // ── Modifier nom ──
  const handleNomSave = async () => {
    try {
      await axios.put(`${API}/profil/nom`, { nom: newNom }, { headers: headers() });
      localStorage.setItem('nom', newNom);
      setAdmin({ ...admin, nom: newNom });
      setEditNom(false);
      showMsg('Nom mis à jour avec succès', 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  // ── Email étape 1 : envoyer code ──
  const handleSendEmailCode = async () => {
    setEmailLoading(true);
    try {
      const res = await axios.post(`${API}/profil/send-email-code`, { email: newEmail }, { headers: headers() });
      showMsg(res.data.message, 'success');
      setEmailStep(2);
      setEmailTimer(600);
      const interval = setInterval(() => {
        setEmailTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setEmailStep(1);
            setEmailCode('');
            showMsg('Code expiré, veuillez recommencer', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setEmailInterval(interval);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Erreur', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Email étape 2 : vérifier code ──
  const handleVerifyEmail = async () => {
    setEmailLoading(true);
    try {
      const res = await axios.post(`${API}/profil/verify-email`, { code: emailCode }, { headers: headers() });
      setAdmin({ ...admin, email: res.data.email });
      setEmailStep(0);
      setNewEmail('');
      setEmailCode('');
      clearInterval(emailInterval);
      setEmailTimer(0);
      showMsg('Email mis à jour avec succès ✅', 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Code incorrect', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Password étape 1 : envoyer code ──
  const handleSendPassCode = async () => {
    setPassLoading(true);
    try {
      const res = await axios.post(`${API}/profil/send-password-code`, {}, { headers: headers() });
      showMsg(res.data.message, 'success');
      setPassStep(2);
      setPassTimer(600);
      const interval = setInterval(() => {
        setPassTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setPassStep(0);
            setPassCode('');
            setNewPass('');
            setConfirmPass('');
            showMsg('Code expiré, veuillez recommencer', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Erreur', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // ── Password étape 2 : vérifier code + nouveau mdp ──
  const handleVerifyPass = async () => {
    if (newPass !== confirmPass) { showMsg('Les mots de passe ne correspondent pas', 'error'); return; }
    if (newPass.length < 6)      { showMsg('Minimum 6 caractères', 'error'); return; }
    setPassLoading(true);
    try {
      await axios.post(`${API}/profil/verify-password`, {
        code: passCode, new_password: newPass
      }, { headers: headers() });
      setPassStep(0);
      setPassCode('');
      setNewPass('');
      setConfirmPass('');
      clearInterval(timerInterval);
      setPassTimer(0);
      showMsg('Mot de passe mis à jour avec succès ✅', 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Code incorrect', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Mon Profil" />
      <main style={s.main}><div style={s.center}>Chargement...</div></main>
    </div>
  );

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Mon Profil" />

      {/* TOAST */}
      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <main style={s.main}>

        {/* HEADER PROFIL */}
        <div style={s.profileHeader}>
          <div style={s.avatar}>
            {admin?.nom?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={s.profileName}>{admin?.nom}</h2>
            <p style={s.profileEmail}>{admin?.email}</p>
            <span style={s.roleBadge}>
              {admin?.role === 'super_admin' ? '👑 Super Admin' : '🔧 Admin'}
            </span>
          </div>
        </div>

        <div style={s.cardsGrid}>

          {/* ── CARD NOM ── */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>👤 Nom d'affichage</h3>
            <p style={s.cardSub}>Modifiez votre nom affiché dans l'interface</p>
            {editNom ? (
              <div>
                <input
                  type="text"
                  value={newNom}
                  onChange={e => setNewNom(e.target.value)}
                  style={s.input}
                  placeholder="Votre nom"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setEditNom(false)} style={s.btnCancel}>Annuler</button>
                  <button onClick={handleNomSave} style={s.btnConfirm}>Sauvegarder</button>
                </div>
              </div>
            ) : (
              <div style={s.currentValue}>
                <span style={s.valueText}>{admin?.nom}</span>
                <button onClick={() => setEditNom(true)} style={s.btnEdit}>✏️ Modifier</button>
              </div>
            )}
          </div>

          {/* ── CARD EMAIL ── */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📧 Adresse Email</h3>
            <p style={s.cardSub}>Un code de vérification sera envoyé au nouvel email</p>

            {emailStep === 0 && (
              <div style={s.currentValue}>
                <span style={s.valueText}>{admin?.email}</span>
                <button onClick={() => setEmailStep(1)} style={s.btnEdit}>✏️ Modifier</button>
              </div>
            )}

            {emailStep === 1 && (
              <div>
                <label style={s.label}>Nouvel email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="nouvel@email.com"
                  style={s.input}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => { setEmailStep(0); setNewEmail(''); }} style={s.btnCancel}>
                    Annuler
                  </button>
                  <button onClick={handleSendEmailCode} style={s.btnConfirm}
                    disabled={emailLoading || !newEmail}>
                    {emailLoading ? 'Envoi...' : '📨 Envoyer le code'}
                  </button>
                </div>
              </div>
            )}

            {emailStep === 2 && (
              <div>
                <div style={{
                  ...s.timerBox,
                  background: emailTimer < 60 ? '#fee2e2' : '#fef3c7',
                  color:      emailTimer < 60 ? '#dc2626' : '#d97706',
                }}>
                  <span>⏱️ Code expire dans</span>
                  <span style={{ fontWeight: 700 }}>
                    {Math.floor(emailTimer / 60)}:{String(emailTimer % 60).padStart(2, '0')}
                  </span>
                </div>
                <div style={s.codeInfo}>
                  📨 Code envoyé à <strong>{newEmail}</strong>
                </div>
                <label style={s.label}>Code à 6 chiffres</label>
                <input
                  type="text"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    ...s.input,
                    textAlign: 'center', fontSize: 24,
                    letterSpacing: 8, fontWeight: 700,
                    borderColor: emailCode.length === 6 ? '#008339' : '#e5e7eb'
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => {
                    setEmailStep(1);
                    setEmailCode('');
                    clearInterval(emailInterval);
                    setEmailTimer(0);
                  }} style={s.btnCancel}>
                    Retour
                  </button>
                  <button onClick={handleVerifyEmail} style={s.btnConfirm}
                    disabled={emailLoading || emailCode.length !== 6}>
                    {emailLoading ? 'Vérification...' : '✅ Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── CARD MOT DE PASSE ── */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>🔒 Mot de passe</h3>
            <p style={s.cardSub}>Un code de vérification sera envoyé à votre email actuel</p>

            {passStep === 0 && (
              <button onClick={handleSendPassCode} style={s.btnConfirm} disabled={passLoading}>
                {passLoading ? 'Envoi...' : '📨 Changer le mot de passe'}
              </button>
            )}

            {passStep === 2 && (
              <div>
                <div style={{
                  ...s.timerBox,
                  background: passTimer < 60 ? '#fee2e2' : '#fef3c7',
                  color:      passTimer < 60 ? '#dc2626' : '#d97706',
                }}>
                  <span>⏱️ Code expire dans</span>
                  <span style={{ fontWeight: 700 }}>
                    {Math.floor(passTimer / 60)}:{String(passTimer % 60).padStart(2, '0')}
                  </span>
                </div>
                <div style={s.codeInfo}>
                  📨 Code envoyé à <strong>{admin?.email}</strong>
                </div>
                <label style={s.label}>Code à 6 chiffres</label>
                <input
                  type="text"
                  value={passCode}
                  onChange={e => setPassCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    ...s.input,
                    textAlign: 'center', fontSize: 24,
                    letterSpacing: 8, fontWeight: 700, marginBottom: 12,
                    borderColor: passCode.length === 6 ? '#008339' : '#e5e7eb'
                  }}
                />
                <label style={s.label}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  style={{
                    ...s.input, marginBottom: 4,
                    borderColor: newPass.length === 0 ? '#e5e7eb'
                               : newPass.length < 6  ? '#ef4444' : '#008339'
                  }}
                />
                {newPass.length > 0 && newPass.length < 6 && (
                  <p style={s.errorMsg}>❌ Minimum 6 caractères ({newPass.length}/6)</p>
                )}
                {newPass.length >= 6 && (
                  <p style={s.successMsg}>✅ Longueur correcte</p>
                )}
                <label style={{ ...s.label, marginTop: 12 }}>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  style={{
                    ...s.input, marginBottom: 4,
                    borderColor: confirmPass.length === 0 ? '#e5e7eb'
                               : confirmPass !== newPass  ? '#ef4444' : '#008339'
                  }}
                />
                {confirmPass.length > 0 && confirmPass !== newPass && (
                  <p style={s.errorMsg}>❌ Les mots de passe ne correspondent pas</p>
                )}
                {confirmPass.length > 0 && confirmPass === newPass && newPass.length >= 6 && (
                  <p style={s.successMsg}>✅ Mots de passe identiques</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => {
                    setPassStep(0);
                    setPassCode('');
                    setNewPass('');
                    setConfirmPass('');
                    clearInterval(timerInterval);
                    setPassTimer(0);
                  }} style={s.btnCancel}>
                    Annuler
                  </button>
                  <button
                    onClick={handleVerifyPass}
                    style={{
                      ...s.btnConfirm,
                      opacity: (passLoading || passCode.length !== 6 || newPass.length < 6 || newPass !== confirmPass) ? 0.5 : 1
                    }}
                    disabled={passLoading || passCode.length !== 6 || newPass.length < 6 || newPass !== confirmPass}
                  >
                    {passLoading ? 'Vérification...' : '✅ Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── CARD INFO ── */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>ℹ️ Informations du compte</h3>
            <div style={s.infoList}>
              <InfoRow label="Rôle"          value={admin?.role === 'super_admin' ? 'Super Administrateur' : 'Administrateur'} />
              <InfoRow label="Membre depuis" value={admin?.date}  />
              <InfoRow label="Email actuel"  value={admin?.email} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value || '—'}</span>
    </div>
  );
}

const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },
  center:  { textAlign: 'center', padding: 48, color: '#9ca3af' },

  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 24,
    background: '#fff', borderRadius: 16, padding: 28,
    marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)'
  },
  avatar:      { width: 80, height: 80, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, flexShrink: 0 },
  profileName: { fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 4 },
  profileEmail:{ fontSize: 14, color: '#6b7280', marginBottom: 8 },
  roleBadge:   { padding: '4px 12px', background: '#e6f4ec', color: '#008339', borderRadius: 20, fontSize: 13, fontWeight: 600 },

  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 },
  card:      { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 6 },
  cardSub:   { fontSize: 13, color: '#9ca3af', marginBottom: 20 },

  currentValue: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 },
  valueText:    { fontSize: 15, fontWeight: 600, color: '#1f2937' },
  btnEdit:      { padding: '8px 16px', background: '#e6f4ec', color: '#008339', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  label:  { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:  { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },

  timerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  codeInfo: { background: '#e6f4ec', color: '#008339', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },

  errorMsg:   { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  successMsg: { color: '#008339', fontSize: 12, marginBottom: 8 },

  btnCancel:  { padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  infoList:  { display: 'flex', flexDirection: 'column', gap: 12 },
  infoRow:   { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' },
  infoLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
  infoValue: { fontSize: 13, color: '#1f2937', fontWeight: 600 },
};
