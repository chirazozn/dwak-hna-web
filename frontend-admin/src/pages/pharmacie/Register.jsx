import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/dwakhnalogo.png';

const API = 'http://127.0.0.1:5000/api';

export default function Register() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState({ text: '', type: '' });
  const [wilayas,    setWilayas]    = useState([]);
  const [communes,   setCommunes]   = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [form, setForm] = useState({
    nom: '', telephone: '',
    wilaya_id: '', commune_id: '',
    latitude: '', longitude: '',
    email: '', mot_de_passe: '', confirm_pass: '',
  });

  // Documents
  const [carteIdentite,    setCarteIdentite]    = useState(null);
  const [registreCommerce, setRegistreCommerce] = useState(null);
  const [cartePreview,     setCartePreview]     = useState('');
  const [registrePreview,  setRegistrePreview]  = useState('');

  // Email code
  const [code,           setCode]           = useState('');
  const [codeLoading,    setCodeLoading]    = useState(false);
  const [timer,          setTimer]          = useState(0);
  const [timerRef,       setTimerRef]       = useState(null);
  const [pharmacieEmail, setPharmacieEmail] = useState('');
  const [pharmPass,      setPharmPass]      = useState('');

  useEffect(() => {
    fetchWilayas();
    return () => { if (timerRef) clearInterval(timerRef); };
  }, []);

  const fetchWilayas = async () => {
    try {
      const res = await axios.get(`${API}/wilayas`);
      setWilayas(res.data.wilayas);
    } catch (e) { console.error(e); }
  };

  const fetchCommunes = async (wilaya_id) => {
    try {
      const res = await axios.get(`${API}/communes/${wilaya_id}`);
      setCommunes(res.data.communes);
    } catch (e) { console.error(e); }
  };

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ── Upload document ──
  const handleUpload = async (file, type) => {
    if (!file) return null;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(ext)) {
      showToast('Format non supporté (PNG, JPG)', 'error');
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('file',  file);
      formData.append('type',  type);
      formData.append('email', 'temp');
      const res = await axios.post(`${API}/pharmacie/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.url;
    } catch (e) {
      showToast('Erreur upload document', 'error');
      return null;
    }
  };

  // ── Preview fichier ──
  const handleFileChange = (file, type) => {
    if (!file) return;
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf';
    if (type === 'carte_identite') {
      setCarteIdentite(file);
      setCartePreview(preview);
    } else {
      setRegistreCommerce(file);
      setRegistrePreview(preview);
    }
  };

  // ── GPS ──
  const getGPS = () => {
    if (!navigator.geolocation) { showToast('Géolocalisation non supportée', 'error'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        f('latitude', lat);
        f('longitude', lng);
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
          );
          const addr     = res.data.address || {};
          const stateRaw = (addr.state || addr.county || '').toLowerCase()
            .replace('wilaya de ', '').replace("wilaya d'", '').trim();
          const wilayaMatch = wilayas.find(w =>
            w.nom.toLowerCase().includes(stateRaw) || stateRaw.includes(w.nom.toLowerCase())
          );
          if (wilayaMatch) {
            f('wilaya_id', String(wilayaMatch.wilaya_id));
            const commRes = await axios.get(`${API}/communes/${wilayaMatch.wilaya_id}`);
            const comms   = commRes.data.communes;
            setCommunes(comms);
            const cityRaw  = (addr.city || addr.town || addr.village || addr.suburb || '').toLowerCase();
            const commMatch = comms.find(c =>
              c.nom.toLowerCase().includes(cityRaw) || cityRaw.includes(c.nom.toLowerCase())
            );
            if (commMatch) {
              f('commune_id', String(commMatch.commune_id));
              showToast(`✅ Détecté : ${wilayaMatch.nom}, ${commMatch.nom}`, 'success');
            } else {
              showToast(`✅ Wilaya : ${wilayaMatch.nom} — choisissez la commune`, 'success');
            }
          } else {
            showToast('GPS détecté — choisissez wilaya/commune manuellement', 'success');
          }
        } catch (e) {
          showToast('GPS détecté ✅ — sélectionnez wilaya/commune', 'success');
        } finally {
          setGpsLoading(false);
        }
      },
      () => { setGpsLoading(false); showToast('Position refusée — saisie manuelle', 'error'); }
    );
  };
  const validateTelephone = (tel) => {
  // Accepte : +213 5/6/7XXXXXXXX ou 05/06/07XXXXXXXX
  const regex = /^(\+213|0)(5|6|7)[0-9]{8}$/;
  return regex.test(tel.replace(/\s/g, ''));
};
const goStep2 = () => {
  if (!form.nom.trim())       { showToast('Le nom est obligatoire', 'error');                  return; }
  if (!form.telephone.trim()) { showToast('Le téléphone est obligatoire', 'error');            return; }
  if (!validateTelephone(form.telephone)) {
    showToast('Numéro invalide. Format : +213 6XXXXXXXX ou 06XXXXXXXX', 'error');
    return;
  }
  if (!carteIdentite)         { showToast("La carte d'identité est obligatoire", 'error');     return; }
  if (!registreCommerce)      { showToast('Le registre de commerce est obligatoire', 'error'); return; }
  setStep(2);
};

  
  // ── Étape 2 → 3 ──
  const goStep3 = () => {
    if (!form.wilaya_id)  { showToast('Choisissez une wilaya', 'error');  return; }
    if (!form.commune_id) { showToast('Choisissez une commune', 'error'); return; }
    setStep(3);
  };

  // ── Étape 3 : Upload docs + envoyer code email (pas encore en BDD) ──
  const handleRegister = async () => {
    if (!form.email.trim())            { showToast('Email obligatoire', 'error');         return; }
    if (!form.mot_de_passe.trim())     { showToast('Mot de passe obligatoire', 'error');  return; }
    if (form.mot_de_passe.length < 6)  { showToast('Minimum 6 caractères', 'error');      return; }
    if (form.mot_de_passe !== form.confirm_pass) {
      showToast('Mots de passe différents', 'error'); return;
    }
    setLoading(true);
    try {
      showToast('⬆️ Upload des documents...', 'success');
      const carteUrl    = await handleUpload(carteIdentite,    'carte_identite');
      const registreUrl = await handleUpload(registreCommerce, 'registre_commerce');

      if (!carteUrl || !registreUrl) {
        setLoading(false);
        return;
      }

      // Envoyer code → données stockées en mémoire Flask (pas encore en BDD)
      await axios.post(`${API}/pharmacie/register`, {
        nom:               form.nom,
        telephone:         form.telephone,
        wilaya_id:         form.wilaya_id,
        commune_id:        form.commune_id,
        latitude:          form.latitude  || null,
        longitude:         form.longitude || null,
        email:             form.email,
        mot_de_passe:      form.mot_de_passe,
        carte_identite:    carteUrl,
        registre_commerce: registreUrl,
      });

      setPharmacieEmail(form.email);
      setPharmPass(form.mot_de_passe);
      startTimer();
      setStep(4);
      showToast(`📨 Code envoyé à ${form.email}`, 'success');

    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur inscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Timer ──
  const startTimer = () => {
    setTimer(600);
    const ref = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(ref); return 0; }
        return prev - 1;
      });
    }, 1000);
    setTimerRef(ref);
  };

  // ── Étape 4 : Vérifier code → créer compte en BDD → redirect dashboard cadenassé ──
const handleVerifyCode = async () => {
  if (code.length !== 6) { showToast('Code à 6 chiffres requis', 'error'); return; }
  setCodeLoading(true);
  try {
    // Code correct → compte créé en BDD (en_attente, email_verifie=TRUE)
    await axios.post(`${API}/pharmacie/verify-email`, {
      email: pharmacieEmail,
      code:  code,
    });

    if (timerRef) clearInterval(timerRef);

    // Stocker email/pass pour polling dans dashboard
    localStorage.setItem('pending_email', pharmacieEmail);
    localStorage.setItem('pending_pass',  pharmPass);

    // ✅ Redirect dashboard cadenassé directement
    navigate('/pharmacie/dashboard', {
      state: { email: pharmacieEmail, password: pharmPass }
    });

  } catch (err) {
    // Code faux → Toast erreur, on reste sur étape 4
    showToast(err.response?.data?.message || 'Code incorrect ❌', 'error');
  } finally {
    setCodeLoading(false);
  }
};

  // ── Renvoyer code ──
  const handleResend = async () => {
    try {
      await axios.post(`${API}/pharmacie/resend-code`, { email: pharmacieEmail });
      if (timerRef) clearInterval(timerRef);
      setCode('');
      startTimer();
      showToast('Nouveau code envoyé ✅', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur envoi', 'error');
    }
  };

  // ── Drop zone component ──
  const DropZone = ({ type, file, preview, onFile }) => (
    <div
      style={{
        ...s.dropZone,
        borderColor: file ? '#008339' : '#e5e7eb',
        background:  file ? '#f0fdf4' : '#fafafa',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f, type); }}
    >
      {file ? (
        <div style={{ textAlign: 'center' }}>
          {preview === 'pdf'
            ? <div style={{ fontSize: 40 }}>📄</div>
            : <img src={preview} alt="preview" style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8 }} />
          }
          <p style={{ fontSize: 12, color: '#008339', fontWeight: 600, margin: '6px 0 0' }}>
            ✅ {file.name}
          </p>
          <button
            onClick={() => onFile(null, type)}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
            ✕ Supprimer
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Glissez votre fichier ici ou</p>
          <label style={s.uploadBtn}>
            Parcourir
<input type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) onFile(e.target.files[0], type); }} />
          </label>
        </div>
      )}
    </div>
  );

  const handleDropZoneChange = (file, type) => {
    if (!file) {
      if (type === 'carte_identite') { setCarteIdentite(null); setCartePreview(''); }
      else { setRegistreCommerce(null); setRegistrePreview(''); }
      return;
    }
    handleFileChange(file, type);
  };

  const progress = [
    { n: 1, label: 'Infos'        },
    { n: 2, label: 'Localisation' },
    { n: 3, label: 'Compte'       },
    { n: 4, label: 'Email'        },
  ];

  return (
    <div style={s.container}>
      <div style={s.card}>

        <img src={logo} alt="Dwak Hna" style={s.logo} />
        <h1 style={s.title}>Inscription Pharmacie</h1>

        {/* TOAST */}
        {toast.text && (
          <div style={{ ...s.toast, background: toast.type === 'success' ? '#008339' : '#ef4444' }}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.text}
          </div>
        )}

        {/* PROGRESS */}
        {step <= 4 && (
          <div style={s.progressWrap}>
            {progress.map((p, i) => (
              <React.Fragment key={p.n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    ...s.progressDot,
                    background: step >= p.n ? '#008339' : '#e5e7eb',
                    color:      step >= p.n ? '#fff'    : '#9ca3af',
                  }}>
                    {step > p.n ? '✓' : p.n}
                  </div>
                  <span style={{ fontSize: 11, color: step >= p.n ? '#008339' : '#9ca3af', fontWeight: 600 }}>
                    {p.label}
                  </span>
                </div>
                {i < progress.length - 1 && (
                  <div style={{ ...s.progressLine, background: step > p.n ? '#008339' : '#e5e7eb' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── ÉTAPE 1 : Infos + Documents ── */}
        {step === 1 && (
          <div style={s.stepWrap}>
            <h2 style={s.stepTitle}>🏥 Informations de la pharmacie</h2>

            <Field label="Nom de la pharmacie *" placeholder="ex: Pharmacie El Wafa"
              value={form.nom} onChange={v => f('nom', v)} />
           <Field label="Téléphone *" placeholder="+213 6XXXXXXXX ou 06XXXXXXXX" type="tel"
  value={form.telephone} onChange={v => f('telephone', v)} />

{form.telephone.length > 0 && (
  <p style={{
    fontSize: 12, marginTop: -10, marginBottom: 10,
    color: validateTelephone(form.telephone) ? '#008339' : '#ef4444'
  }}>
    {validateTelephone(form.telephone)
      ? '✅ Numéro valide'
      : '❌ Format invalide (ex: +213 661234567 ou 0661234567)'}
  </p>
)}

            {/* DOCUMENTS */}
            <div style={s.docsBox}>
              <p style={s.docsTitle}>📄 Documents obligatoires</p>

              <div style={s.formGroup}>
<label style={s.label}>🪪 Carte d'identité * (PNG, JPG)</label>
<DropZone
                  type="carte_identite"
                  file={carteIdentite}
                  preview={cartePreview}
                  onFile={handleDropZoneChange}
                />
              </div>

              <div style={s.formGroup}>
<label style={s.label}>📋 Registre de commerce * (PNG, JPG)</label>                
                <DropZone
                  type="registre_commerce"
                  file={registreCommerce}
                  preview={registrePreview}
                  onFile={handleDropZoneChange}
                />
              </div>
            </div>

            <button onClick={goStep2} style={s.btnPrimary}>Suivant →</button>

            <p style={s.loginLink}>
              Déjà un compte ?{' '}
              <span onClick={() => navigate('/login')} style={s.link}>Se connecter</span>
            </p>
          </div>
        )}

        {/* ── ÉTAPE 2 : Localisation ── */}
        {step === 2 && (
          <div style={s.stepWrap}>
            <h2 style={s.stepTitle}>📍 Localisation</h2>

            <button onClick={getGPS} disabled={gpsLoading} style={s.btnGPS}>
              {gpsLoading ? '📡 Détection en cours...' : '📍 Détecter ma position automatiquement'}
            </button>

            {form.latitude && form.longitude && (
              <div style={s.gpsSuccess}>
                📡 GPS : {form.latitude}, {form.longitude}
              </div>
            )}

            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>ou saisir manuellement</span>
              <div style={s.dividerLine} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Wilaya *</label>
              <select value={form.wilaya_id} onChange={e => {
                f('wilaya_id',  e.target.value);
                f('commune_id', '');
                if (e.target.value) fetchCommunes(e.target.value);
                else setCommunes([]);
              }} style={s.select}>
                <option value="">-- Choisir une wilaya --</option>
                {wilayas.map(w => (
                  <option key={w.wilaya_id} value={w.wilaya_id}>{w.code} — {w.nom}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Commune *</label>
              <select value={form.commune_id}
                onChange={e => f('commune_id', e.target.value)}
                style={{ ...s.select, opacity: !form.wilaya_id ? 0.5 : 1 }}
                disabled={!form.wilaya_id}>
                <option value="">-- Choisir une commune --</option>
                {communes.map(c => (
                  <option key={c.commune_id} value={c.commune_id}>{c.nom}</option>
                ))}
              </select>
              {!form.wilaya_id && (
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Choisissez d'abord une wilaya</p>
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Coordonnées GPS (optionnel)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" value={form.latitude}
                  onChange={e => f('latitude', e.target.value)}
                  placeholder="Latitude ex: 36.7372"
                  style={{ ...s.input, flex: 1 }} />
                <input type="text" value={form.longitude}
                  onChange={e => f('longitude', e.target.value)}
                  placeholder="Longitude ex: 3.0865"
                  style={{ ...s.input, flex: 1 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={s.btnSecondary}>← Retour</button>
              <button onClick={goStep3}          style={s.btnPrimary}>Suivant →</button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Compte ── */}
        {step === 3 && (
          <div style={s.stepWrap}>
            <h2 style={s.stepTitle}>🔐 Créer votre compte</h2>

            <Field label="Email *" type="email" placeholder="pharmacie@email.dz"
              value={form.email} onChange={v => f('email', v)} />

            <Field label="Mot de passe *" type="password" placeholder="Minimum 6 caractères"
              value={form.mot_de_passe} onChange={v => f('mot_de_passe', v)} />

            {form.mot_de_passe.length > 0 && (
              <div style={s.passStrengthWrap}>
                <div style={{
                  height: 5, borderRadius: 4, transition: 'all 0.3s',
                  width:      form.mot_de_passe.length < 6  ? '33%' : form.mot_de_passe.length < 10 ? '66%' : '100%',
                  background: form.mot_de_passe.length < 6  ? '#ef4444' : form.mot_de_passe.length < 10 ? '#f59e0b' : '#008339',
                }} />
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {form.mot_de_passe.length < 6 ? '⚠️ Faible' : form.mot_de_passe.length < 10 ? '🟡 Moyen' : '✅ Fort'}
                </span>
              </div>
            )}

            <Field label="Confirmer le mot de passe *" type="password"
              placeholder="Répétez le mot de passe"
              value={form.confirm_pass} onChange={v => f('confirm_pass', v)} />

            {form.confirm_pass.length > 0 && (
              <p style={{ fontSize: 12, marginTop: -8, marginBottom: 12,
                color: form.confirm_pass === form.mot_de_passe ? '#008339' : '#ef4444' }}>
                {form.confirm_pass === form.mot_de_passe ? '✅ Mots de passe identiques' : '❌ Mots de passe différents'}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={s.btnSecondary}>← Retour</button>
              <button onClick={handleRegister}   style={s.btnPrimary} disabled={loading}>
                {loading ? '⬆️ En cours...' : '📨 Créer mon compte'}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : Code email ── */}
        {step === 4 && (
          <div style={s.stepWrap}>
            <h2 style={s.stepTitle}>📧 Confirmez votre email</h2>

            <div style={s.emailInfo}>
              📨 Code envoyé à <strong>{pharmacieEmail}</strong>
            </div>

            <div style={{
              ...s.timerBox,
              background: timer < 60 ? '#fee2e2' : '#fef3c7',
              color:      timer < 60 ? '#dc2626' : '#d97706',
            }}>
              <span>⏱️ Expire dans</span>
              <span style={{ fontWeight: 700 }}>
                {timer > 0
                  ? `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`
                  : '❌ Expiré'}
              </span>
            </div>

            <label style={s.label}>Code à 6 chiffres</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                ...s.input,
                textAlign: 'center', fontSize: 28,
                letterSpacing: 10, fontWeight: 700, marginBottom: 12,
                borderColor: code.length === 6 ? '#008339' : '#e5e7eb',
              }}
            />

            <button onClick={handleVerifyCode}
              style={{ ...s.btnPrimary, opacity: code.length !== 6 ? 0.6 : 1 }}
              disabled={codeLoading || code.length !== 6}>
              {codeLoading ? 'Vérification...' : '✅ Confirmer le code'}
            </button>

            <button onClick={handleResend}
              style={{ ...s.btnSecondary, marginTop: 10, width: '100%' }}>
              🔄 Renvoyer le code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div style={s.formGroup}>
      <label style={s.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={s.input}
      />
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #008339 0%, #006128 100%)', padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '40px 36px',
    width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  logo:  { width: 80, display: 'block', margin: '0 auto 12px' },
  title: { fontSize: 22, fontWeight: 700, color: '#1f2937', textAlign: 'center', marginBottom: 20 },

  toast: {
    color: '#fff', padding: '12px 16px', borderRadius: 10,
    marginBottom: 16, fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
  },

  progressWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  progressDot:  { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, transition: 'all 0.3s', flexShrink: 0 },
  progressLine: { height: 3, width: 36, transition: 'all 0.3s', marginBottom: 20 },

  stepWrap:  { display: 'flex', flexDirection: 'column' },
  stepTitle: { fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 18, textAlign: 'center' },

  formGroup: { marginBottom: 14 },
  label:     { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:     { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  select:    { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' },

  docsBox:   { background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0', marginBottom: 14 },
  docsTitle: { fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 14, marginTop: 0 },

  dropZone: {
    border: '2px dashed #e5e7eb', borderRadius: 10,
    padding: '20px 16px', cursor: 'pointer',
    transition: 'all 0.2s', minHeight: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  uploadBtn: {
    display: 'inline-block', marginTop: 8,
    padding: '6px 16px', background: '#008339', color: '#fff',
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },

  btnGPS:     { width: '100%', padding: '12px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 },
  gpsSuccess: { background: '#dcfce7', color: '#15803d', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 10, textAlign: 'center' },

  divider:     { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' },

  passStrengthWrap: { background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 },

  emailInfo: { background: '#e6f4ec', color: '#008339', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14, textAlign: 'center' },
  timerBox:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 },

  btnPrimary:   { flex: 1, padding: '13px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { flex: 1, padding: '13px', background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  loginLink: { textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' },
  link:      { color: '#008339', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
};