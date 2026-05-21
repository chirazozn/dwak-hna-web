import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import SidebarPharmacie from '../../components/SidebarPharmacie';
import NavbarPharmacie  from '../../components/NavbarPharmacie';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/pharmacie';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const defaultHoraires = () => JOURS.reduce((acc, j) => ({
  ...acc,
  [j]: { ouvert: j !== 'Dimanche', debut: '08:00', fin: '18:00' }
}), {});

// ✅ Validation téléphone algérien
const validateTel = (tel) => {
  const regex = /^(\+213|0)(5|6|7)[0-9]{8}$/;
  return regex.test(tel.replace(/\s/g, ''));
};

export default function PharmacieProfil() {
  const [pharmacie,       setPharmacie]       = useState(null);
  const [statut,          setStatut]          = useState('approuvee');
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState({ text: '', type: '' });
  const [activeTab,       setActiveTab]       = useState('infos');

  // Infos générales
  const [infos,           setInfos]           = useState({ nom: '', telephone: '', wilaya_id: '', commune_id: '' });
  const [infosLoading,    setInfosLoading]    = useState(false);
  const [wilayas,         setWilayas]         = useState([]);
  const [communes,        setCommunes]        = useState([]);

  // Logo
  const [logoUrl,         setLogoUrl]         = useState('');
  const [logoFile,        setLogoFile]        = useState(null);
  const [logoPreview,     setLogoPreview]     = useState('');
  const [logoLoading,     setLogoLoading]     = useState(false);

  // Horaires
  const [horaires,        setHoraires]        = useState(defaultHoraires());
  const [horairesLoading, setHorairesLoading] = useState(false);

  // Email
  const [emailStep,       setEmailStep]       = useState(0);
  const [newEmail,        setNewEmail]        = useState('');
  const [emailCode,       setEmailCode]       = useState('');
  const [emailLoading,    setEmailLoading]    = useState(false);
  const [emailTimer,      setEmailTimer]      = useState(0);
  const emailTimerRef = useRef(null);

  // Mot de passe
  const [passStep,        setPassStep]        = useState(0);
  const [passCode,        setPassCode]        = useState('');
  const [newPass,         setNewPass]         = useState('');
  const [confirmPass,     setConfirmPass]     = useState('');
  const [passLoading,     setPassLoading]     = useState(false);
  const [passTimer,       setPassTimer]       = useState(0);
  const passTimerRef = useRef(null);

  const showToast = (text, type) => setToast({ text, type });

  const startTimer = (setTimer, timerRef) => {
    setTimer(600);
    const ref = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(ref); return 0; }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = ref;
  };

  const fmtTimer = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

  // Helper — données complètes pour le PUT (évite d'écraser logo/horaires)
  const buildPutBody = (overrides = {}) => ({
    nom:        infos.nom,
    telephone:  infos.telephone,
    wilaya_id:  infos.wilaya_id  || null,
    commune_id: infos.commune_id || null,
    logo_url:   logoUrl          || null,
    horaires:   JSON.stringify(horaires),
    ...overrides,
  });

  useEffect(() => {
    fetchAll();
    return () => {
      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
      if (passTimerRef.current)  clearInterval(passTimerRef.current);
    };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profilRes, wilayasRes] = await Promise.all([
        axios.get(`${API}/profil`, { headers: headers() }),
        axios.get('https://dwak-hna-web.onrender.com/api/wilayas'),
      ]);
      const p = profilRes.data.pharmacie;
      setPharmacie(p);
      setStatut(p.statut);
      setLogoUrl(p.logo_url || '');
      setInfos({
        nom:        p.nom        || '',
        telephone:  p.telephone  || '',
        wilaya_id:  p.wilaya_id  ? String(p.wilaya_id)  : '',
        commune_id: p.commune_id ? String(p.commune_id) : '',
      });
      if (p.horaires) {
        try {
          const h = typeof p.horaires === 'string' ? JSON.parse(p.horaires) : p.horaires;
          setHoraires({ ...defaultHoraires(), ...h });
        } catch { setHoraires(defaultHoraires()); }
      }
      setWilayas(wilayasRes.data.wilayas || []);
      if (p.wilaya_id) fetchCommunes(p.wilaya_id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCommunes = async (wilaya_id) => {
    try {
      const res = await axios.get(`https://dwak-hna-web.onrender.com/api/communes/${wilaya_id}`);
      setCommunes(res.data.communes || []);
    } catch (e) { console.error(e); }
  };

  // ── Sauvegarder infos ──
  const handleSaveInfos = async () => {
    if (!infos.nom.trim())       { showToast('Le nom est obligatoire', 'error');               return; }
    if (!infos.telephone.trim()) { showToast('Le téléphone est obligatoire', 'error');         return; }
    if (!validateTel(infos.telephone)) {
      showToast('Numéro invalide — ex: 0661234567 ou +213661234567', 'error'); return;
    }
    setInfosLoading(true);
    try {
      // ✅ buildPutBody garde logo_url + horaires existants
      await axios.put(`${API}/profil`, buildPutBody(), { headers: headers() });
      localStorage.setItem('nom', infos.nom);
      showToast('✅ Informations mises à jour !', 'success');
      fetchAll();
    } catch (e) {
      showToast(e.response?.data?.message || 'Erreur', 'error');
    } finally {
      setInfosLoading(false);
    }
  };

  // ── Logo ──
  const handleLogoChange = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(ext)) {
      showToast('PNG ou JPG uniquement', 'error'); return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) { showToast('Sélectionnez une image', 'error'); return; }
    setLogoLoading(true);
    try {
      const formData = new FormData();
      formData.append('file',  logoFile);
      formData.append('type',  'logo');
      formData.append('email', pharmacie?.email || 'logo');

      const uploadRes = await axios.post(
        'https://dwak-hna-web.onrender.com/api/pharmacie/upload-document',
        formData,
        { headers: { ...headers(), 'Content-Type': 'multipart/form-data' } }
      );
      const url = uploadRes.data.url;

      // ✅ buildPutBody + nouvelle URL logo
      await axios.put(`${API}/profil`, buildPutBody({ logo_url: url }), { headers: headers() });

      setLogoUrl(url);
      setLogoFile(null);
      setLogoPreview('');
      showToast('✅ Logo mis à jour !', 'success');
    } catch (e) {
      showToast('Erreur upload logo', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  // ── Horaires ──
  const handleHoraire = (jour, key, val) => {
    setHoraires(prev => ({ ...prev, [jour]: { ...prev[jour], [key]: val } }));
  };

  const handleSaveHoraires = async () => {
    setHorairesLoading(true);
    try {
      // ✅ buildPutBody garde logo_url + infos
      await axios.put(`${API}/profil`, buildPutBody(), { headers: headers() });
      showToast('✅ Horaires mis à jour !', 'success');
    } catch (e) {
      showToast('Erreur sauvegarde horaires', 'error');
    } finally {
      setHorairesLoading(false);
    }
  };

  // ── Email ──
  const handleSendEmailCode = async () => {
    if (!newEmail.trim()) { showToast('Email obligatoire', 'error'); return; }
    setEmailLoading(true);
    try {
      await axios.post(`${API}/profil/send-email-code`, { email: newEmail }, { headers: headers() });
      setEmailStep(1);
      startTimer(setEmailTimer, emailTimerRef);
      showToast(`Code envoyé à ${newEmail}`, 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'Erreur', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (emailCode.length !== 6) { showToast('Code à 6 chiffres requis', 'error'); return; }
    setEmailLoading(true);
    try {
      await axios.post(`${API}/profil/verify-email`, { code: emailCode }, { headers: headers() });
      showToast('✅ Email mis à jour !', 'success');
      setEmailStep(0); setNewEmail(''); setEmailCode('');
      clearInterval(emailTimerRef.current);
      fetchAll();
    } catch (e) {
      showToast(e.response?.data?.message || 'Code incorrect', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Mot de passe ──
  const handleSendPassCode = async () => {
    setPassLoading(true);
    try {
      await axios.post(`${API}/profil/send-password-code`, {}, { headers: headers() });
      setPassStep(1);
      startTimer(setPassTimer, passTimerRef);
      showToast('Code envoyé à votre email', 'success');
    } catch (e) {
      showToast('Erreur envoi code', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  const handleVerifyPass = async () => {
    if (passCode.length !== 6)   { showToast('Code à 6 chiffres requis', 'error');  return; }
    if (newPass.length < 6)      { showToast('Minimum 6 caractères', 'error');       return; }
    if (newPass !== confirmPass) { showToast('Mots de passe différents', 'error');   return; }
    setPassLoading(true);
    try {
      await axios.post(`${API}/profil/verify-password`, {
        code: passCode, new_password: newPass
      }, { headers: headers() });
      showToast('✅ Mot de passe mis à jour !', 'success');
      setPassStep(0); setPassCode(''); setNewPass(''); setConfirmPass('');
      clearInterval(passTimerRef.current);
    } catch (e) {
      showToast(e.response?.data?.message || 'Code incorrect', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  const estApprouve = statut === 'approuvee';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <p style={{ color: '#6b7280' }}>Chargement...</p>
    </div>
  );

  return (
    <div style={s.root}>
      <SidebarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} />
      <NavbarPharmacie  estApprouve={estApprouve} pharmacie={pharmacie} title="Mon Profil" />
      <Toast message={toast.text} type={toast.type} onClose={() => setToast({ text: '', type: '' })} />

      <main style={s.main}>

        {/* PROFIL HEADER */}
        <div style={s.profilHeader}>
          <div style={s.avatarWrap}>
            {logoPreview || logoUrl ? (
              <img src={logoPreview || logoUrl} alt="Logo" style={s.avatarImg} />
            ) : (
              <div style={s.avatarLetter}>
                {(pharmacie?.nom || 'P').charAt(0).toUpperCase()}
              </div>
            )}
            <label style={s.avatarEdit} title="Changer le logo">
              📷
              <input type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }}
                onChange={e => handleLogoChange(e.target.files[0])} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={s.profilNom}>{pharmacie?.nom}</h2>
            <p style={s.profilEmail}>{pharmacie?.email}</p>
            <span style={{
              ...s.statutBadge,
              background: estApprouve ? '#dcfce7' : '#fef3c7',
              color:      estApprouve ? '#15803d' : '#d97706',
            }}>
              {estApprouve ? '✅ Compte approuvé' : '⏳ En attente'}
            </span>
          </div>
          {logoFile && (
            <button onClick={handleLogoUpload} disabled={logoLoading} style={s.btnSaveLogo}>
              {logoLoading ? 'Upload...' : '💾 Sauvegarder le logo'}
            </button>
          )}
        </div>

        {/* TABS */}
        <div style={s.tabs}>
          {[
            { key: 'infos',    label: '📋 Informations' },
            { key: 'horaires', label: '🕐 Horaires'      },
            { key: 'email',    label: '📧 Email'          },
            { key: 'password', label: '🔐 Mot de passe'  },
          ].map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB INFOS ── */}
        {activeTab === 'infos' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>📋 Informations générales</h3>
            <div style={s.formGrid}>

              <div style={s.formGroup}>
                <label style={s.label}>Nom de la pharmacie *</label>
                <input type="text" value={infos.nom}
                  onChange={e => setInfos(d => ({ ...d, nom: e.target.value }))}
                  style={s.input} placeholder="Nom de la pharmacie" />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Téléphone *</label>
                <input type="tel" value={infos.telephone}
                  onChange={e => setInfos(d => ({ ...d, telephone: e.target.value }))}
                  style={{
                    ...s.input,
                    borderColor: infos.telephone && !validateTel(infos.telephone) ? '#fca5a5' : '#e5e7eb',
                  }}
                  placeholder="0661234567 ou +213661234567" />
                {infos.telephone.length > 0 && (
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: validateTel(infos.telephone) ? '#008339' : '#ef4444' }}>
                    {validateTel(infos.telephone) ? '✅ Numéro valide' : '❌ Format invalide (ex: 0661234567)'}
                  </p>
                )}
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Wilaya</label>
                <select value={infos.wilaya_id}
                  onChange={e => {
                    setInfos(d => ({ ...d, wilaya_id: e.target.value, commune_id: '' }));
                    fetchCommunes(e.target.value);
                  }}
                  style={s.select}>
                  <option value="">-- Choisir une wilaya --</option>
                  {wilayas.map(w => (
                    <option key={w.wilaya_id} value={w.wilaya_id}>{w.code} — {w.nom}</option>
                  ))}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Commune</label>
                <select value={infos.commune_id}
                  onChange={e => setInfos(d => ({ ...d, commune_id: e.target.value }))}
                  style={{ ...s.select, opacity: !infos.wilaya_id ? 0.5 : 1 }}
                  disabled={!infos.wilaya_id}>
                  <option value="">-- Choisir une commune --</option>
                  {communes.map(c => (
                    <option key={c.commune_id} value={c.commune_id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={handleSaveInfos} disabled={infosLoading} style={s.btnPrimary}>
                {infosLoading ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB HORAIRES ── */}
        {activeTab === 'horaires' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ ...s.cardTitle, marginBottom: 0 }}>🕐 Horaires d'ouverture</h3>
              <div style={s.horairesInfo}>
                ℹ️ L'ouverture/fermeture sera automatique selon ces horaires
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {JOURS.map(jour => (
                <div key={jour} style={{
                  ...s.joursRow,
                  background:  horaires[jour]?.ouvert ? '#f0fdf4' : '#f8fafc',
                  borderColor: horaires[jour]?.ouvert ? '#bbf7d0' : '#e5e7eb',
                }}>
                  <button
                    onClick={() => handleHoraire(jour, 'ouvert', !horaires[jour]?.ouvert)}
                    style={{
                      ...s.jourToggle,
                      background: horaires[jour]?.ouvert ? '#008339' : '#e5e7eb',
                      color:      horaires[jour]?.ouvert ? '#fff'    : '#6b7280',
                    }}>
                    {horaires[jour]?.ouvert ? '✅' : '❌'}
                  </button>

                  <span style={{
                    ...s.jourNom,
                    color:      horaires[jour]?.ouvert ? '#1f2937' : '#9ca3af',
                    fontWeight: horaires[jour]?.ouvert ? 700       : 400,
                  }}>
                    {jour}
                  </span>

                  {horaires[jour]?.ouvert ? (
                    <div style={s.jourHeures}>
                      <input type="time"
                        value={horaires[jour]?.debut || '08:00'}
                        onChange={e => handleHoraire(jour, 'debut', e.target.value)}
                        style={s.timeInput} />
                      <span style={{ color: '#6b7280', fontSize: 14 }}>→</span>
                      <input type="time"
                        value={horaires[jour]?.fin || '18:00'}
                        onChange={e => handleHoraire(jour, 'fin', e.target.value)}
                        style={s.timeInput} />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Fermé</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={handleSaveHoraires} disabled={horairesLoading} style={s.btnPrimary}>
                {horairesLoading ? 'Sauvegarde...' : '💾 Sauvegarder les horaires'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB EMAIL ── */}
        {activeTab === 'email' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>📧 Modifier l'email</h3>

            <div style={s.currentInfo}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Email actuel :</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{pharmacie?.email}</span>
            </div>

            {emailStep === 0 && (
              <>
                <div style={s.formGroup}>
                  <label style={s.label}>Nouvel email *</label>
                  <input type="email" value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    style={s.input} placeholder="nouveau@email.dz" />
                </div>
                <button onClick={handleSendEmailCode} disabled={emailLoading} style={s.btnPrimary}>
                  {emailLoading ? 'Envoi...' : '📨 Envoyer le code de vérification'}
                </button>
              </>
            )}

            {emailStep === 1 && (
              <>
                <div style={s.codeInfo}>📨 Code envoyé à <strong>{newEmail}</strong></div>
                <div style={{
                  ...s.timerBox,
                  background: emailTimer < 60 ? '#fee2e2' : '#fef3c7',
                  color:      emailTimer < 60 ? '#dc2626' : '#d97706',
                }}>
                  <span>⏱️ Expire dans</span>
                  <span style={{ fontWeight: 700 }}>{emailTimer > 0 ? fmtTimer(emailTimer) : '❌ Expiré'}</span>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Code à 6 chiffres</label>
                  <input type="text" value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: 700 }}
                    placeholder="000000" maxLength={6} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setEmailStep(0); setEmailCode(''); clearInterval(emailTimerRef.current); }} style={s.btnSecondary}>
                    ← Retour
                  </button>
                  <button onClick={handleVerifyEmail}
                    disabled={emailLoading || emailCode.length !== 6}
                    style={{ ...s.btnPrimary, flex: 1, opacity: emailCode.length !== 6 ? 0.5 : 1 }}>
                    {emailLoading ? 'Vérification...' : '✅ Confirmer'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB MOT DE PASSE ── */}
        {activeTab === 'password' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>🔐 Modifier le mot de passe</h3>

            {passStep === 0 && (
              <>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                  Un code de vérification sera envoyé à : <strong>{pharmacie?.email}</strong>
                </p>
                <button onClick={handleSendPassCode} disabled={passLoading} style={s.btnPrimary}>
                  {passLoading ? 'Envoi...' : '📨 Envoyer le code de vérification'}
                </button>
              </>
            )}

            {passStep === 1 && (
              <>
                <div style={s.codeInfo}>📨 Code envoyé à <strong>{pharmacie?.email}</strong></div>
                <div style={{
                  ...s.timerBox,
                  background: passTimer < 60 ? '#fee2e2' : '#fef3c7',
                  color:      passTimer < 60 ? '#dc2626' : '#d97706',
                }}>
                  <span>⏱️ Expire dans</span>
                  <span style={{ fontWeight: 700 }}>{passTimer > 0 ? fmtTimer(passTimer) : '❌ Expiré'}</span>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Code à 6 chiffres</label>
                  <input type="text" value={passCode}
                    onChange={e => setPassCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: 700 }}
                    placeholder="000000" maxLength={6} />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Nouveau mot de passe *</label>
                  <input type="password" value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    style={s.input} placeholder="Minimum 6 caractères" />
                  {newPass.length > 0 && (
                    <div style={s.passStrength}>
                      <div style={{
                        height: 4, borderRadius: 4, transition: 'all 0.3s',
                        width:      newPass.length < 6 ? '33%' : newPass.length < 10 ? '66%' : '100%',
                        background: newPass.length < 6 ? '#ef4444' : newPass.length < 10 ? '#f59e0b' : '#008339',
                      }} />
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {newPass.length < 6 ? '⚠️ Faible' : newPass.length < 10 ? '🟡 Moyen' : '✅ Fort'}
                      </span>
                    </div>
                  )}
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Confirmer le mot de passe *</label>
                  <input type="password" value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    style={s.input} placeholder="Répétez le mot de passe" />
                  {confirmPass.length > 0 && (
                    <p style={{ fontSize: 12, margin: '4px 0 0', color: confirmPass === newPass ? '#008339' : '#ef4444' }}>
                      {confirmPass === newPass ? '✅ Identiques' : '❌ Différents'}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => { setPassStep(0); setPassCode(''); setNewPass(''); setConfirmPass(''); clearInterval(passTimerRef.current); }}
                    style={s.btnSecondary}>
                    ← Retour
                  </button>
                  <button
                    onClick={handleVerifyPass}
                    disabled={passLoading || passCode.length !== 6 || newPass.length < 6 || newPass !== confirmPass}
                    style={{ ...s.btnPrimary, flex: 1, opacity: (passCode.length !== 6 || newPass.length < 6 || newPass !== confirmPass) ? 0.5 : 1 }}>
                    {passLoading ? 'Vérification...' : '✅ Mettre à jour'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main: { marginLeft: 260, marginTop: 70, padding: 32, flex: 1, maxWidth: 900 },

  profilHeader: { display: 'flex', alignItems: 'center', gap: 24, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 24, flexWrap: 'wrap' },
  avatarWrap:   { position: 'relative', flexShrink: 0 },
  avatarImg:    { width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb' },
  avatarLetter: { width: 88, height: 88, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 },
  avatarEdit:   { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#fff', borderRadius: '50%', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  profilNom:    { fontSize: 22, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' },
  profilEmail:  { fontSize: 14, color: '#6b7280', margin: '0 0 8px' },
  statutBadge:  { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnSaveLogo:  { padding: '10px 20px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  tabs:      { display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 12, padding: 4 },
  tab:       { flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280', background: 'transparent' },
  tabActive: { background: '#fff', color: '#008339', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },

  card:      { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 20, marginTop: 0 },

  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 },
  formGroup: { marginBottom: 14 },
  label:     { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:     { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  select:    { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' },

  horairesInfo: { fontSize: 12, color: '#6b7280', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' },
  joursRow:     { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, border: '1.5px solid', transition: 'all 0.2s' },
  jourToggle:   { width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  jourNom:      { width: 90, fontSize: 14, flexShrink: 0, transition: 'all 0.2s' },
  jourHeures:   { display: 'flex', alignItems: 'center', gap: 8 },
  timeInput:    { padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' },

  currentInfo: { background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' },
  codeInfo:    { background: '#e6f4ec', color: '#008339', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14, textAlign: 'center' },
  timerBox:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },

  passStrength: { background: '#f8fafc', borderRadius: 6, padding: '8px 10px', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },

  btnPrimary:   { padding: '12px 24px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '12px 20px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
