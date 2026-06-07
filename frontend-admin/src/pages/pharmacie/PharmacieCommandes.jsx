import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import SidebarPharmacie from '../../components/SidebarPharmacie';
import NavbarPharmacie from '../../components/NavbarPharmacie';
import Toast from '../../components/Toast';

const API = 'https://dwak-hna-web.onrender.com/api/pharmacie';
const getToken = () => localStorage.getItem('token');
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export default function PharmacieCommandes() {
  const [pharmacie, setPharmacie] = useState(null);
  const [statut, setStatut] = useState('approuvee');
  const [activeTab, setActiveTab] = useState('en_attente');
  const [commandes, setCommandes] = useState([]);
  const [stats, setStats] = useState({ en_attente: 0, acceptees: 0, refusees: 0, terminees: 0 });
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ text: '', type: '' });
  const [modal, setModal] = useState(null);
  const [modeVoir, setModeVoir] = useState(false);
  const [reponse, setReponse] = useState({ statut: '', message: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const isMountedRef = useRef(false);
  const pollRef = useRef(null);

  const showToast = (text, type) => setToast({ text, type });

  const fetchPharmacie = async () => {
    try {
      const res = await axios.get(`${API}/dashboard`, { headers: headers() });
      setPharmacie(res.data.pharmacie);
      setStatut(res.data.pharmacie?.statut || 'en_attente');
    } catch (e) { console.error(e); }
  };

  const fetchCommandes = useCallback(async () => {
    if (!isMountedRef.current) setLoading(true);
    try {
      const res = await axios.get(`${API}/commandes`, {
        params: { page, search, filtre: activeTab === 'en_attente' ? 'en_attente' : filtre },
        headers: headers(),
      });
      isMountedRef.current = true;
      setCommandes(res.data.commandes || []);
      setStats(res.data.stats || { en_attente: 0, acceptees: 0, refusees: 0, terminees: 0 });
      setTotalPages(res.data.pages || 1);
    } catch (e) {
      console.error(e);
      showToast('Erreur chargement commandes', 'error');
    } finally { setLoading(false); }
  }, [page, search, filtre, activeTab]);

  useEffect(() => { fetchPharmacie(); }, []);
  useEffect(() => { isMountedRef.current = false; fetchCommandes(); }, [fetchCommandes]);
  useEffect(() => {
    pollRef.current = setInterval(fetchCommandes, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchCommandes]);

  const closeModal = () => {
    setModal(null);
    setModeVoir(false);
    setReponse({ statut: '', message: '' });
  };

  const openRepondre = (commande) => {
    setModal(commande);
    setModeVoir(false);
    setReponse({ statut: '', message: '' });
  };

  const openVoir = (commande) => {
    setModal(commande);
    setModeVoir(true);
    setReponse({ statut: '', message: '' });
  };

  const handleActionCommande = async () => {
    if (!modal?.commande_id) return;
    if (!reponse.statut) { showToast('Choisissez accepter ou refuser', 'error'); return; }
    if (reponse.statut === 'refusee' && !reponse.message.trim()) { showToast('Message obligatoire pour refuser', 'error'); return; }
    setActionLoading(true);
    try {
      const endpoint = reponse.statut === 'acceptee'
        ? `${API}/commandes/${modal.commande_id}/accepter`
        : `${API}/commandes/${modal.commande_id}/refuser`;
      await axios.post(endpoint, { message: reponse.message }, { headers: headers() });
      showToast(reponse.statut === 'acceptee' ? '✅ Commande acceptée' : '❌ Commande refusée', reponse.statut === 'acceptee' ? 'success' : 'error');
      closeModal();
      fetchCommandes();
    } catch (e) { showToast(e.response?.data?.message || 'Erreur action commande', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleTerminer = async (commande) => {
    if (!window.confirm('Marquer cette commande comme terminée ?')) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/commandes/${commande.commande_id}/terminer`, {}, { headers: headers() });
      showToast('✅ Commande terminée', 'success');
      closeModal();
      fetchCommandes();
    } catch (e) { showToast(e.response?.data?.message || 'Erreur terminaison commande', 'error'); }
    finally { setActionLoading(false); }
  };

  const estApprouve = statut === 'approuvee';
  const money = (v) => `${Number(v || 0).toFixed(2)} DA`;
  const status = {
    en_attente: { bg: '#fef3c7', color: '#d97706', label: '⏳ En attente' },
    acceptee: { bg: '#dcfce7', color: '#15803d', label: '✅ Acceptée' },
    refusee: { bg: '#fee2e2', color: '#dc2626', label: '❌ Refusée' },
    terminee: { bg: '#dbeafe', color: '#1d4ed8', label: '📦 Terminée' },
  };

  return (
    <div style={s.root}>
      <SidebarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} />
      <NavbarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} title="Commandes" />
      <Toast message={toast.text} type={toast.type} onClose={() => setToast({ text: '', type: '' })} />
      <main style={s.main}>
        <div style={s.statsGrid}>
          <StatCard icon="⏳" label="En attente" value={stats.en_attente} accent="#d97706" />
          <StatCard icon="✅" label="Acceptées" value={stats.acceptees} accent="#15803d" />
          <StatCard icon="❌" label="Refusées" value={stats.refusees} accent="#dc2626" />
          <StatCard icon="📦" label="Terminées" value={stats.terminees} accent="#1d4ed8" />
        </div>
        <div style={s.tabs}>
          <button onClick={() => { setActiveTab('en_attente'); setPage(1); setFiltre('tous'); }} style={{ ...s.tab, ...(activeTab === 'en_attente' ? s.tabActive : {}) }}>⏳ En attente {stats.en_attente > 0 && <span style={s.tabBadge}>{stats.en_attente}</span>}</button>
          <button onClick={() => { setActiveTab('historique'); setPage(1); setFiltre('tous'); }} style={{ ...s.tab, ...(activeTab === 'historique' ? s.tabActive : {}) }}>📋 Historique</button>
        </div>
        <div style={s.card}>
          <div style={s.searchRow}>
            <div style={s.searchBox}><span>🔍</span><input placeholder="Rechercher patient, téléphone ou produit..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={s.searchInput}/></div>
            {activeTab === 'historique' && ['tous','acceptee','refusee','terminee'].map(f => <button key={f} onClick={() => { setFiltre(f); setPage(1); }} style={{ ...s.filtreBtn, ...(filtre === f ? s.filtreBtnActive : {}) }}>{f}</button>)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}><thead><tr>{['Patient','Produits','Total','Message','Date',activeTab === 'en_attente' ? 'Action' : 'Statut & Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} style={s.center}>Chargement...</td></tr> : commandes.length === 0 ? <tr><td colSpan={6} style={s.center}>📭 Aucune commande</td></tr> : commandes.map((c,i)=>(
                  <tr key={c.commande_id} style={i%2===0?s.trEven:s.trOdd}>
                    <td style={s.td}><b>{c.patient || 'Patient'}</b><br/><span style={s.muted}>#{c.commande_id} {c.patient_tel ? ` · ${c.patient_tel}` : ''}</span></td>
                    <td style={s.td}>{c.lignes?.slice(0,2).map(l => <div key={l.commande_ligne_id} style={s.medItem}>🛍️ {l.nom_produit} ×{l.quantite}</div>)}{c.lignes?.length>2 && <span style={s.muted}>+{c.lignes.length-2} autres</span>}</td>
                    <td style={s.td}><b style={{color:'#008339'}}>{money(c.total)}</b></td>
                    <td style={s.td}><span style={s.muted}>{c.message_patient || '—'}</span></td>
                    <td style={s.td}><span style={s.muted}>{c.date}</span></td>
                    <td style={s.td}>{activeTab === 'en_attente' ? <button onClick={() => openRepondre(c)} style={s.btnRepondre}>💬 Répondre</button> : <><span style={{...s.badge,...(status[c.statut]||status.en_attente)}}>{(status[c.statut]||status.en_attente).label}</span><br/><button onClick={()=>openVoir(c)} style={s.btnVoir}>👁️ Voir détails</button></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div style={s.pagination}><PageBtn label="‹" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}/>{Array.from({length:totalPages},(_,i)=>i+1).map(n=><PageBtn key={n} label={n} onClick={()=>setPage(n)} active={n===page}/>)}<PageBtn label="›" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}/></div>}
        </div>
      </main>
      {modal && <div style={s.overlay} onClick={() => !actionLoading && closeModal()}><div style={s.modalBox} onClick={e=>e.stopPropagation()}>
        <div style={s.modalHeader}><h3 style={s.modalTitle}>{modeVoir ? '📦 Détails de la commande' : '💬 Répondre à la commande'}</h3><button onClick={closeModal} style={s.modalClose}>✕</button></div>
        <div style={s.patientInfo}><b>{modal.patient || 'Patient'}</b><span style={s.muted}>Commande #{modal.commande_id} · {modal.date}</span></div>
        <div style={s.medsBox}><p style={s.boxTitle}>🛍️ Produits commandés</p>{modal.lignes?.map(l => <div key={l.commande_ligne_id} style={s.productLine}><span><b>{l.nom_produit}</b><br/>{money(l.prix_unitaire)} × {l.quantite}</span><b>{money(l.sous_total)}</b></div>)}<div style={s.totalBox}><span>Total</span><b>{money(modal.total)}</b></div></div>
        {modal.message_patient && <div style={s.msgBox}><p style={s.boxTitle}>💬 Message patient</p>{modal.message_patient}</div>}
        {!modeVoir ? <><div style={s.choixRow}><button onClick={()=>setReponse(r=>({...r,statut:'acceptee'}))} style={s.choixBtn}>✅ Accepter</button><button onClick={()=>setReponse(r=>({...r,statut:'refusee'}))} style={s.choixBtn}>❌ Refuser</button></div><textarea value={reponse.message} onChange={e=>setReponse(r=>({...r,message:e.target.value}))} placeholder="Message au patient..." rows={3} style={s.textarea}/><div style={s.actionRow}><button onClick={closeModal} style={s.btnCancel}>Annuler</button><button onClick={handleActionCommande} disabled={!reponse.statut || actionLoading} style={{...s.btnConfirm, background: reponse.statut==='refusee'?'#ef4444':'#008339'}}>Confirmer</button></div></> : <div style={s.actionRow}>{modal.statut === 'acceptee' && <button onClick={()=>handleTerminer(modal)} style={{...s.btnConfirm, background:'#1d4ed8'}}>📦 Marquer terminée</button>}<button onClick={closeModal} style={s.btnCancel}>Fermer</button></div>}
      </div></div>}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) { return <div style={s.statCard}><div style={{width:50,height:50,borderRadius:13,background:accent+'18',color:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{icon}</div><div><div style={{fontSize:26,fontWeight:700}}>{value}</div><div style={{fontSize:13,color:'#6b7280'}}>{label}</div></div></div>; }
function PageBtn({ label, onClick, disabled, active }) { return <button onClick={onClick} disabled={disabled} style={{minWidth:36,height:36,borderRadius:8,border:active?'none':'1.5px solid #e5e7eb',background:active?'#008339':'#fff',color:active?'#fff':'#374151',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1}}>{label}</button>; }

const s = {
  root:{display:'flex',minHeight:'100vh',background:'#f8fafc',fontFamily:"'Inter', sans-serif"}, main:{marginLeft:260,marginTop:70,padding:32,flex:1},
  statsGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:24}, statCard:{background:'#fff',borderRadius:16,padding:24,display:'flex',alignItems:'center',gap:16,boxShadow:'0 1px 6px rgba(0,0,0,0.07)'},
  tabs:{display:'flex',gap:4,marginBottom:20,background:'#f3f4f6',borderRadius:12,padding:4}, tab:{flex:1,padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',fontSize:14,fontWeight:600,color:'#6b7280',background:'transparent'}, tabActive:{background:'#fff',color:'#008339',boxShadow:'0 1px 4px rgba(0,0,0,0.1)'}, tabBadge:{background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:20},
  card:{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 1px 6px rgba(0,0,0,0.07)'}, searchRow:{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'}, searchBox:{display:'flex',alignItems:'center',flex:1,minWidth:260,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 14px',gap:8}, searchInput:{flex:1,border:'none',background:'transparent',outline:'none',padding:'11px 0',fontSize:14},
  filtreBtn:{padding:'8px 16px',borderRadius:20,border:'1.5px solid #e5e7eb',background:'#fff',color:'#6b7280',fontSize:13,fontWeight:600,cursor:'pointer'}, filtreBtnActive:{background:'#008339',color:'#fff',border:'1.5px solid #008339'},
  table:{width:'100%',borderCollapse:'collapse',minWidth:820}, th:{textAlign:'left',padding:'12px 16px',fontSize:12,fontWeight:600,color:'#6b7280',textTransform:'uppercase',background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}, td:{padding:'13px 16px',fontSize:14,color:'#374151',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6'}, trEven:{background:'#fff'}, trOdd:{background:'#fafafa'},
  badge:{padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600}, medItem:{fontSize:12,color:'#374151',background:'#f3f4f6',padding:'2px 8px',borderRadius:6,marginBottom:2}, muted:{color:'#6b7280',fontSize:13}, btnRepondre:{padding:'8px 16px',background:'#008339',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}, btnVoir:{padding:'6px 12px',background:'#e6f4ec',color:'#008339',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',marginTop:6},
  pagination:{display:'flex',justifyContent:'center',alignItems:'center',gap:6,marginTop:24,paddingTop:20,borderTop:'1px solid #f0f0f0'}, center:{textAlign:'center',padding:48,color:'#9ca3af'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}, modalBox:{background:'#fff',borderRadius:20,padding:'28px 32px',width:'100%',maxWidth:620,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}, modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}, modalTitle:{fontSize:18,fontWeight:700,margin:0}, modalClose:{background:'none',border:'none',fontSize:20,cursor:'pointer'}, patientInfo:{display:'flex',flexDirection:'column',gap:4,background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:16},
  medsBox:{background:'#f0fdf4',borderRadius:10,padding:'12px 16px',marginBottom:12}, msgBox:{background:'#fef3c7',borderRadius:10,padding:'12px 16px',marginBottom:12}, boxTitle:{fontSize:12,fontWeight:700,color:'#6b7280',marginBottom:8,marginTop:0,textTransform:'uppercase'}, productLine:{display:'flex',justifyContent:'space-between',gap:12,padding:'10px 0',borderBottom:'1px solid #dcfce7'}, totalBox:{display:'flex',justifyContent:'space-between',marginTop:12,paddingTop:12,borderTop:'2px solid #bbf7d0',color:'#008339'},
  choixRow:{display:'flex',gap:10,marginBottom:16}, choixBtn:{flex:1,padding:12,borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:700,border:'1.5px solid #e5e7eb',background:'#fff'}, textarea:{width:'100%',padding:'12px 14px',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:14,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'Inter, sans-serif',marginBottom:14}, actionRow:{display:'flex',gap:12,justifyContent:'flex-end',marginTop:20}, btnCancel:{padding:'11px 24px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontSize:14,fontWeight:600,cursor:'pointer'}, btnConfirm:{padding:'11px 24px',borderRadius:10,border:'none',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}
};
