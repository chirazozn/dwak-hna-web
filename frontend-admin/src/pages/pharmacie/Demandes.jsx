import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import SidebarPharmacie from '../../components/SidebarPharmacie';
import NavbarPharmacie  from '../../components/NavbarPharmacie';
import Toast from '../../components/Toast';

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
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};

export default function PharmacieDemandes() {
  const [pharmacie,       setPharmacie]       = useState(null);
  const [statut,          setStatut]          = useState('approuvee');
  const [activeTab,       setActiveTab]       = useState('en_attente');
  const [demandes,        setDemandes]        = useState([]);
  const [stats,           setStats]           = useState({ en_attente: 0, acceptees: 0, refusees: 0 });
  const [search,          setSearch]          = useState('');
  const [filtre,          setFiltre]          = useState('tous');
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [loading,         setLoading]         = useState(false);
  const [toast,           setToast]           = useState({ text: '', type: '' });
  const [modal,           setModal]           = useState(null);
  const [modeVoir,        setModeVoir]        = useState(false);
  const [msgPredefinis,   setMsgPredefinis]   = useState([]);
  const [reponse,         setReponse]         = useState({ statut: '', message: '', mode: 'predefini' });
  const [repondreLoading, setRepondreLoading] = useState(false);
  const [zoomImg,         setZoomImg]         = useState(null);

  const prevNbRef   = useRef(0);
  const isFirstRef  = useRef(true);
  const isMountedRef = useRef(false);
  const pollRef     = useRef(null);

  const showToast = (text, type) => setToast({ text, type });

  const fetchPharmacie = async () => {
    try {
      const res = await axios.get(`${API}/dashboard`, { headers: headers() });
      setPharmacie(res.data.pharmacie);
      setStatut(res.data.pharmacie?.statut || 'en_attente');
    } catch (e) { console.error(e); }
  };

  const fetchDemandes = useCallback(async () => {
    // ✅ Loading seulement au premier fetch, pas aux polls suivants
    if (!isMountedRef.current) setLoading(true);
    try {
      const res = await axios.get(`${API}/demandes`, {
        params: {
          page,
          search,
          filtre: activeTab === 'en_attente' ? 'en_attente' : filtre,
        },
        headers: headers()
      });
      const nb = res.data.stats?.en_attente || 0;

      if (!isFirstRef.current && nb > prevNbRef.current) {
        playSound();
        showToast('🔔 Nouvelle demande reçue !', 'success');
      }

      isFirstRef.current   = false;
      isMountedRef.current = true;
      prevNbRef.current    = nb;

      // ✅ Mise à jour silencieuse — pas de setLoading entre les polls
      setDemandes(res.data.demandes);
      setStats(res.data.stats);
      setTotalPages(res.data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, filtre, activeTab]);

  const fetchMsgPredefinis = async () => {
    try {
      const res = await axios.get(`${API}/messages-predefinis`, { headers: headers() });
      setMsgPredefinis(res.data.messages || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPharmacie();
    fetchMsgPredefinis();
  }, []);

  useEffect(() => {
    isMountedRef.current = false; // reset au changement de tab/page/filtre
    fetchDemandes();
  }, [fetchDemandes]);

  useEffect(() => {
    pollRef.current = setInterval(fetchDemandes, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchDemandes]);

  const openRepondre = (d) => {
    setModal(d);
    setModeVoir(false);
    setReponse({ statut: '', message: '', mode: 'predefini' });
  };

  const openVoir = (d) => {
    setModal(d);
    setModeVoir(true);
  };

  const closeModal = () => {
    setModal(null);
    setModeVoir(false);
    setReponse({ statut: '', message: '', mode: 'predefini' });
  };

  const handleRepondre = async () => {
    if (!reponse.statut)         { showToast('Choisissez accepter ou refuser', 'error'); return; }
    if (!reponse.message.trim()) { showToast('Le message est obligatoire', 'error');     return; }
    setRepondreLoading(true);
    try {
      await axios.put(
        `${API}/demandes/${modal.demande_id}/repondre`,
        { statut: reponse.statut, message: reponse.message },
        { headers: headers() }
      );
      showToast(
        reponse.statut === 'acceptee' ? '✅ Demande acceptée !' : '❌ Demande refusée',
        reponse.statut === 'acceptee' ? 'success' : 'error'
      );
      closeModal();
      fetchDemandes();
      window.dispatchEvent(new Event('pharmacie-demande-action'));
    } catch (e) {
      showToast('Erreur lors de la réponse', 'error');
    } finally {
      setRepondreLoading(false);
    }
  };

  const estApprouve = statut === 'approuvee';

  const STATUT_CONFIG = {
    en_attente: { bg: '#fef3c7', color: '#d97706', label: '⏳ En attente' },
    acceptee:   { bg: '#dcfce7', color: '#15803d', label: '✅ Acceptée'   },
    refusee:    { bg: '#fee2e2', color: '#dc2626', label: '❌ Refusée'    },
  };

  return (
    <div style={s.root}>
      <SidebarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} />
      <NavbarPharmacie  estApprouve={estApprouve} pharmacie={pharmacie} title="Demandes" />

      <Toast message={toast.text} type={toast.type} onClose={() => setToast({ text: '', type: '' })} />

      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsGrid}>
          <StatCard icon="⏳" label="En attente" value={stats.en_attente} accent="#d97706" />
          <StatCard icon="✅" label="Acceptées"  value={stats.acceptees}  accent="#15803d" />
          <StatCard icon="❌" label="Refusées"   value={stats.refusees}   accent="#dc2626" />
        </div>

        {/* TABS */}
        <div style={s.tabs}>
          <button
            onClick={() => { setActiveTab('en_attente'); setPage(1); setFiltre('tous'); }}
            style={{ ...s.tab, ...(activeTab === 'en_attente' ? s.tabActive : {}) }}>
            ⏳ En attente
            {stats.en_attente > 0 && (
              <span style={s.tabBadge}>{stats.en_attente}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('historique'); setPage(1); setFiltre('tous'); }}
            style={{ ...s.tab, ...(activeTab === 'historique' ? s.tabActive : {}) }}>
            📋 Historique
          </button>
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>

          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={s.searchInput}
              />
            </div>

            {activeTab === 'historique' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'tous',     label: 'Tous'         },
                  { value: 'acceptee', label: '✅ Acceptées' },
                  { value: 'refusee',  label: '❌ Refusées'  },
                ].map(f => (
                  <button key={f.value}
                    onClick={() => { setFiltre(f.value); setPage(1); }}
                    style={{ ...s.filtreBtn, ...(filtre === f.value ? s.filtreBtnActive : {}) }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Patient', 'Type', 'Médicaments', 'Message', 'Date',
                    activeTab === 'en_attente' ? 'Action' : 'Statut & Action'
                  ].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={s.center}>Chargement...</td></tr>
                ) : demandes.length === 0 ? (
                  <tr><td colSpan={6} style={s.center}>
                    {activeTab === 'en_attente'
                      ? '📭 Aucune demande en attente'
                      : "📋 Aucune demande dans l'historique"}
                  </td></tr>
                ) : demandes.map((d, i) => (
                  <tr key={d.demande_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                    <td style={s.td}>
                      <div style={s.patientCell}>
                        <div style={s.patientAvatar}>
                          {d.patient.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={s.patientNom}>{d.patient}</p>
                          {d.patient_tel && (
                            <p style={s.patientTel}>📞 {d.patient_tel}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: d.type === 'ordonnance' ? '#fce7f3' : '#dbeafe',
                        color:      d.type === 'ordonnance' ? '#9d174d' : '#1d4ed8',
                      }}>
                        {d.type === 'ordonnance' ? '📋 Ordonnance' : '✍️ Manuelle'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {d.medicaments?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {d.medicaments.slice(0, 2).map((m, idx) => (
                            <span key={idx} style={s.medItem}>💊 {m.nom} ×{m.quantite}</span>
                          ))}
                          {d.medicaments.length > 2 && (
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              +{d.medicaments.length - 2} autres
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={s.muted}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={s.muted}>
                        {d.message_patient
                          ? d.message_patient.substring(0, 40) + (d.message_patient.length > 40 ? '...' : '')
                          : '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={s.muted}>{d.date}</span>
                    </td>
                    <td style={s.td}>
                      {activeTab === 'en_attente' ? (
                        <button onClick={() => openRepondre(d)} style={s.btnRepondre}>
                          💬 Répondre
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{
                            ...s.badge,
                            ...(STATUT_CONFIG[d.ma_reponse] || STATUT_CONFIG.en_attente),
                          }}>
                            {(STATUT_CONFIG[d.ma_reponse] || STATUT_CONFIG.en_attente).label}
                          </span>
                          {d.ma_reponse_msg && (
                            <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                              "{d.ma_reponse_msg.substring(0, 30)}..."
                            </span>
                          )}
                          {/* ✅ Bouton Voir détails */}
                          <button onClick={() => openVoir(d)} style={s.btnVoir}>
                            👁️ Voir détails
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <PageBtn label="‹" onClick={() => setPage(p => Math.max(1, p - 1))}        disabled={page === 1}          active={false} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <PageBtn key={n} label={n} onClick={() => setPage(n)} disabled={false} active={n === page} />
              ))}
              <PageBtn label="›" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} active={false} />
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL RÉPONDRE / VOIR ── */}
      {modal && (
        <div style={s.overlay} onClick={() => !repondreLoading && closeModal()}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>
                {modeVoir ? '📋 Détails de la demande' : '💬 Répondre à la demande'}
              </h3>
              <button onClick={closeModal} style={s.modalClose}>✕</button>
            </div>

            {/* Infos patient */}
            <div style={s.patientInfo}>
              <div style={{ ...s.patientAvatar, width: 48, height: 48, fontSize: 20 }}>
                {modal.patient.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>{modal.patient}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
                  {modal.type === 'ordonnance' ? '📋 Ordonnance' : '✍️ Manuelle'} · {modal.date}
                  {modal.patient_tel && ` · 📞 ${modal.patient_tel}`}
                </p>
              </div>
            </div>

            {/* Statut si mode voir */}
            {modeVoir && (
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  ...s.badge,
                  fontSize: 14, padding: '8px 16px',
                  ...(STATUT_CONFIG[modal.ma_reponse] || STATUT_CONFIG.en_attente),
                }}>
                  {(STATUT_CONFIG[modal.ma_reponse] || STATUT_CONFIG.en_attente).label}
                </span>
              </div>
            )}

            {/* Médicaments */}
            {modal.medicaments?.length > 0 && (
              <div style={s.medsBox}>
                <p style={s.boxTitle}>💊 Médicaments demandés</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {modal.medicaments.map((m, i) => (
                    <span key={i} style={s.medChip}>{m.nom} ×{m.quantite}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Message patient */}
            {modal.message_patient && (
              <div style={s.msgBox}>
                <p style={s.boxTitle}>💬 Message du patient</p>
                <p style={{ fontSize: 14, color: '#374151', margin: 0, fontStyle: 'italic' }}>
                  "{modal.message_patient}"
                </p>
              </div>
            )}

            {/* Ordonnances */}
            {modal.ordonnances?.length > 0 && (
              <div style={s.ordsBox}>
                <p style={s.boxTitle}>📷 Ordonnances ({modal.ordonnances.length})</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {modal.ordonnances.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Ordonnance ${i + 1}`}
                      style={s.ordThumb}
                      onClick={() => setZoomImg(url)}
                      title="Cliquer pour zoomer"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ma réponse — mode voir uniquement */}
            {modeVoir && modal.ma_reponse_msg && (
              <div style={{ ...s.msgPreview, marginBottom: 20 }}>
                <p style={{ ...s.boxTitle, color: '#008339' }}>📤 Ma réponse</p>
                <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                  "{modal.ma_reponse_msg}"
                </p>
              </div>
            )}

            {/* ── ZONE RÉPONSE — mode répondre uniquement ── */}
            {!modeVoir && (
              <>
                {/* Choix accepter/refuser */}
                <div style={s.choixRow}>
                  <button
                    onClick={() => setReponse(r => ({ ...r, statut: 'acceptee' }))}
                    style={{
                      ...s.choixBtn,
                      border:     reponse.statut === 'acceptee' ? '2.5px solid #008339' : '1.5px solid #e5e7eb',
                      background: reponse.statut === 'acceptee' ? '#e6f4ec' : '#fff',
                      color:      reponse.statut === 'acceptee' ? '#008339' : '#6b7280',
                    }}>
                    ✅ Accepter
                  </button>
                  <button
                    onClick={() => setReponse(r => ({ ...r, statut: 'refusee' }))}
                    style={{
                      ...s.choixBtn,
                      border:     reponse.statut === 'refusee' ? '2.5px solid #ef4444' : '1.5px solid #e5e7eb',
                      background: reponse.statut === 'refusee' ? '#fee2e2' : '#fff',
                      color:      reponse.statut === 'refusee' ? '#ef4444' : '#6b7280',
                    }}>
                    ❌ Refuser
                  </button>
                </div>

                {/* Mode message */}
                <div style={s.modeRow}>
                  <button
                    onClick={() => setReponse(r => ({ ...r, mode: 'predefini', message: '' }))}
                    style={{
                      ...s.modeBtn,
                      background: reponse.mode === 'predefini' ? '#008339' : '#fff',
                      color:      reponse.mode === 'predefini' ? '#fff'    : '#6b7280',
                      border:     reponse.mode === 'predefini' ? 'none'    : '1.5px solid #e5e7eb',
                    }}>
                    📋 Messages prédéfinis
                  </button>
                  <button
                    onClick={() => setReponse(r => ({ ...r, mode: 'perso', message: '' }))}
                    style={{
                      ...s.modeBtn,
                      background: reponse.mode === 'perso' ? '#008339' : '#fff',
                      color:      reponse.mode === 'perso' ? '#fff'    : '#6b7280',
                      border:     reponse.mode === 'perso' ? 'none'    : '1.5px solid #e5e7eb',
                    }}>
                    ✏️ Message personnalisé
                  </button>
                </div>

                {/* Messages prédéfinis */}
                {reponse.mode === 'predefini' && (
                  <div style={s.predefiniGrid}>
                    {msgPredefinis.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: 13 }}>Aucun message prédéfini disponible</p>
                    ) : msgPredefinis.map(m => (
                      <button
                        key={m.message_id}
                        onClick={() => setReponse(r => ({ ...r, message: m.contenu }))}
                        style={{
                          ...s.predefiniBtn,
                          border:     reponse.message === m.contenu ? '2px solid #008339' : '1.5px solid #e5e7eb',
                          background: reponse.message === m.contenu ? '#e6f4ec' : '#fff',
                          color:      reponse.message === m.contenu ? '#008339' : '#374151',
                        }}>
                        {m.contenu}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message personnalisé */}
                {reponse.mode === 'perso' && (
                  <textarea
                    value={reponse.message}
                    onChange={e => setReponse(r => ({ ...r, message: e.target.value }))}
                    placeholder="Écrivez votre message au patient..."
                    rows={3}
                    style={s.textarea}
                  />
                )}

                {/* Preview message sélectionné */}
                {reponse.message && reponse.mode === 'predefini' && (
                  <div style={s.msgPreview}>
                    💬 <strong>Message :</strong> {reponse.message}
                  </div>
                )}

                {/* Boutons action */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={closeModal} style={s.btnCancel} disabled={repondreLoading}>
                    Annuler
                  </button>
                  <button
                    onClick={handleRepondre}
                    style={{
                      ...s.btnConfirm,
                      background: reponse.statut === 'refusee' ? '#ef4444' : '#008339',
                      opacity: (!reponse.statut || !reponse.message.trim() || repondreLoading) ? 0.5 : 1,
                    }}
                    disabled={!reponse.statut || !reponse.message.trim() || repondreLoading}>
                    {repondreLoading
                      ? 'Envoi...'
                      : reponse.statut === 'refusee'
                        ? '❌ Confirmer refus'
                        : '✅ Confirmer acceptation'}
                  </button>
                </div>
              </>
            )}

            {/* Bouton fermer — mode voir uniquement */}
            {modeVoir && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={closeModal} style={s.btnCancel}>Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ZOOM ORDONNANCE */}
      {zoomImg && (
        <div style={s.zoomOverlay} onClick={() => setZoomImg(null)}>
          <div style={s.zoomBox} onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoomImg(null)} style={s.zoomClose}>✕</button>
            <img src={zoomImg} alt="Ordonnance" style={s.zoomImg} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{ width: 50, height: 50, borderRadius: 13, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1f2937' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 36, height: 36, borderRadius: 8,
      border:      active ? 'none' : '1.5px solid #e5e7eb',
      background:  active ? '#008339' : '#fff',
      color:       active ? '#fff'    : '#374151',
      fontSize: 14, fontWeight: active ? 700 : 500,
      cursor:  disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
    }}>
      {label}
    </button>
  );
}

/* ── Styles ── */
const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main: { marginLeft: 260, marginTop: 70, padding: 32, flex: 1 },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 },
  statCard:  { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },

  tabs:      { display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 12, padding: 4 },
  tab:       { flex: 1, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabActive: { background: '#fff', color: '#008339', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  tabBadge:  { background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 20 },

  card:        { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  searchRow:   { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  searchBox:   { display: 'flex', alignItems: 'center', flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', gap: 8 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: 14, color: '#374151' },

  filtreBtn:       { padding: '8px 16px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filtreBtnActive: { background: '#008339', color: '#fff', border: '1.5px solid #008339' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  patientCell:   { display: 'flex', alignItems: 'center', gap: 10 },
  patientAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  patientNom:    { fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 14 },
  patientTel:    { fontSize: 12, color: '#9ca3af', margin: 0 },
  badge:         { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  medItem:       { fontSize: 12, color: '#374151', background: '#f3f4f6', padding: '2px 8px', borderRadius: 6 },
  muted:         { color: '#6b7280', fontSize: 13 },
  btnRepondre:   { padding: '8px 16px', background: '#008339', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnVoir:       { padding: '6px 12px', background: '#e6f4ec', color: '#008339', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' },
  center:     { textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: 14 },

  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modalBox:    { background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 },
  modalClose:  { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' },

  patientInfo: { display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 16 },

  medsBox:  { background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', marginBottom: 12 },
  msgBox:   { background: '#fef3c7', borderRadius: 10, padding: '12px 16px', marginBottom: 12 },
  ordsBox:  { background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 12 },
  boxTitle: { fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },

  ordThumb: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', border: '2px solid #e5e7eb', transition: 'border-color 0.2s' },

  choixRow: { display: 'flex', gap: 10, marginBottom: 16 },
  choixBtn: { flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s' },

  modeRow: { display: 'flex', gap: 8, marginBottom: 14 },
  modeBtn: { flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },

  predefiniGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  predefiniBtn:  { padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' },

  textarea:   { width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', marginBottom: 14 },
  msgPreview: { background: '#e6f4ec', color: '#008339', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 8 },

  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },

  medChip: { padding: '4px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 12, fontWeight: 600 },

  zoomOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 },
  zoomBox:     { position: 'relative', maxWidth: '90vw', maxHeight: '90vh' },
  zoomClose:   { position: 'absolute', top: -16, right: -16, background: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  zoomImg:     { maxWidth: '85vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' },
};
