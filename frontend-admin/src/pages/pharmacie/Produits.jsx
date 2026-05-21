import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import SidebarPharmacie from '../../components/SidebarPharmacie';
import NavbarPharmacie  from '../../components/NavbarPharmacie';
import Toast from '../../components/Toast';

const API      = 'http://127.0.0.1:5000/api/pharmacie';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

export default function PharmacieProduits() {
  const [pharmacie,     setPharmacie]     = useState(null);
  const [statut,        setStatut]        = useState('approuvee');
  const [produits,      setProduits]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ text: '', type: '' });
  const [search,        setSearch]        = useState('');
  const [filtre,        setFiltre]        = useState('tous');

  // Modal ajout
  const [showAjout,     setShowAjout]     = useState(false);
  const [etapeAjout,    setEtapeAjout]    = useState(1);
  const [catalogue,     setCatalogue]     = useState([]);
  const [searchCat,     setSearchCat]     = useState('');
  const [filtreCat,     setFiltreCat]     = useState('tous');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selection,     setSelection]     = useState([]);
  const [ajoutLoading,  setAjoutLoading]  = useState(false);

  // Modal modifier
  const [modalModif,    setModalModif]    = useState(null);
  const [modifData,     setModifData]     = useState({ prix: '', description_perso: '', est_disponible: true });
  const [modifLoading,  setModifLoading]  = useState(false);

  const isMountedRef = useRef(false);
  const searchTimer  = useRef(null);

  const showToast = (text, type) => setToast({ text, type });

  const fetchPharmacie = async () => {
    try {
      const res = await axios.get(`${API}/dashboard`, { headers: headers() });
      setPharmacie(res.data.pharmacie);
      setStatut(res.data.pharmacie?.statut || 'en_attente');
    } catch (e) { console.error(e); }
  };

  const fetchProduits = useCallback(async () => {
    if (!isMountedRef.current) setLoading(true);
    try {
      const res = await axios.get(`${API}/produits`, { headers: headers() });
      isMountedRef.current = true;
      setProduits(res.data.produits || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPharmacie();
    fetchProduits();
  }, [fetchProduits]);

  const fetchCatalogue = async (q = '', type = 'tous') => {
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API}/produits/search`, {
        params: { search: q, type: type === 'tous' ? '' : type },
        headers: headers()
      });
      setCatalogue(res.data.resultats || []);
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };

  useEffect(() => {
    if (!showAjout) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCatalogue(searchCat, filtreCat), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchCat, filtreCat, showAjout]);

  const closeAjout = () => {
    setShowAjout(false);
    setSelection([]);
    setSearchCat('');
    setEtapeAjout(1);
    setFiltreCat('tous');
  };

  const handleToggleSelection = (produit) => {
    setSelection(prev => {
      const exists = prev.find(p => p.admin_produit_id === produit.admin_produit_id);
      if (exists) return prev.filter(p => p.admin_produit_id !== produit.admin_produit_id);
      return [...prev, { ...produit, prix: '', description_perso: '', est_disponible: true }];
    });
  };

  const handleAjout = async () => {
    if (selection.length === 0) { showToast('Sélectionnez au moins un produit', 'error'); return; }
    const sansPrix = selection.filter(p => !p.prix || p.prix === '');
    if (sansPrix.length > 0) {
      showToast(`Prix obligatoire pour : ${sansPrix.map(p => p.nom).join(', ')}`, 'error');
      return;
    }
    setAjoutLoading(true);
    try {
      await axios.post(`${API}/produits`, {
        produits: selection.map(p => ({
          admin_produit_id:  p.admin_produit_id,
          prix:              p.prix,
          description_perso: p.description_perso || '',
          est_disponible:    p.est_disponible,
        }))
      }, { headers: headers() });
      showToast(`✅ ${selection.length} produit(s) ajouté(s) !`, 'success');
      closeAjout();
      isMountedRef.current = false;
      fetchProduits();
    } catch (e) {
      showToast(e.response?.data?.message || 'Erreur ajout', 'error');
    } finally {
      setAjoutLoading(false);
    }
  };

  const handleOpenModif = (p) => {
    setModalModif(p);
    setModifData({
      prix:              p.prix || '',
      description_perso: p.description_perso || '',
      est_disponible:    p.est_disponible,
    });
  };

  const handleModif = async () => {
    if (!modifData.prix || modifData.prix === '') {
      showToast('Le prix est obligatoire', 'error'); return;
    }
    setModifLoading(true);
    try {
      await axios.put(`${API}/produits/${modalModif.pharmacie_produit_id}`, modifData, { headers: headers() });
      showToast('✅ Produit mis à jour !', 'success');
      setModalModif(null);
      isMountedRef.current = false;
      fetchProduits();
    } catch (e) {
      showToast('Erreur modification', 'error');
    } finally {
      setModifLoading(false);
    }
  };

  const handleDelete = async (pp_id, nom) => {
    if (!window.confirm(`Supprimer "${nom}" de votre catalogue ?`)) return;
    try {
      await axios.delete(`${API}/produits/${pp_id}`, { headers: headers() });
      showToast('Produit supprimé', 'success');
      isMountedRef.current = false;
      fetchProduits();
    } catch (e) {
      showToast('Erreur suppression', 'error');
    }
  };

  const produitsFiltres = produits.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const matchFiltre = filtre === 'tous'          ? true
                      : filtre === 'disponible'    ? p.est_disponible
                      : filtre === 'indisponible'  ? !p.est_disponible
                      : filtre === 'medicament'    ? p.type_produit === 'medicament'
                      : filtre === 'parapharmacie' ? p.type_produit === 'parapharmacie'
                      : true;
    return matchSearch && matchFiltre;
  });

  const estApprouve = statut === 'approuvee';

  return (
    <div style={s.root}>
      <SidebarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} />
      <NavbarPharmacie  estApprouve={estApprouve} pharmacie={pharmacie} title="Mes Produits" />
      <Toast message={toast.text} type={toast.type} onClose={() => setToast({ text: '', type: '' })} />

      <main style={s.main}>

        {/* STATS */}
        <div style={s.statsGrid}>
          <StatCard icon="📦" label="Total"          value={produits.length}                                                  accent="#008339" />
          <StatCard icon="✅" label="Disponibles"    value={produits.filter(p => p.est_disponible).length}                   accent="#15803d" />
          <StatCard icon="❌" label="Indisponibles"  value={produits.filter(p => !p.est_disponible).length}                  accent="#dc2626" />
          <StatCard icon="💊" label="Médicaments"    value={produits.filter(p => p.type_produit === 'medicament').length}    accent="#8b5cf6" />
          <StatCard icon="🧴" label="Parapharmacie"  value={produits.filter(p => p.type_produit === 'parapharmacie').length} accent="#f59e0b" />
        </div>

        {/* HEADER */}
        <div style={s.pageHeader}>
          <h2 style={s.pageTitle}>📦 Mon catalogue produits</h2>
          <button onClick={() => { setShowAjout(true); fetchCatalogue('', 'tous'); }} style={s.btnAjouter}>
            ➕ Ajouter des produits
          </button>
        </div>

        {/* CARD LISTE */}
        <div style={s.card}>
          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Rechercher dans mes produits..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={s.searchInput}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { value: 'tous',          label: 'Tous'              },
                { value: 'disponible',    label: '✅ Disponibles'    },
                { value: 'indisponible',  label: '❌ Indisponibles'  },
                { value: 'medicament',    label: '💊 Médicaments'    },
                { value: 'parapharmacie', label: '🧴 Parapharmacie'  },
              ].map(f => (
                <button key={f.value}
                  onClick={() => setFiltre(f.value)}
                  style={{ ...s.filtreBtn, ...(filtre === f.value ? s.filtreBtnActive : {}) }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={s.center}>Chargement...</div>
          ) : produitsFiltres.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <p style={{ color: '#6b7280', fontSize: 15 }}>
                {produits.length === 0
                  ? "Vous n'avez pas encore de produits — ajoutez-en depuis le catalogue !"
                  : 'Aucun produit ne correspond à votre recherche'}
              </p>
              {produits.length === 0 && (
                <button onClick={() => { setShowAjout(true); fetchCatalogue('', 'tous'); }} style={s.btnAjouter}>
                  ➕ Ajouter des produits
                </button>
              )}
            </div>
          ) : (
            <div style={s.produitsGrid}>
              {produitsFiltres.map(p => (
                <div key={p.pharmacie_produit_id} style={s.produitCard}>
                  <div style={s.produitHeader}>
                    <span style={{
                      ...s.typeBadge,
                      background: p.type_produit === 'medicament' ? '#dbeafe' : '#fce7f3',
                      color:      p.type_produit === 'medicament' ? '#1d4ed8' : '#9d174d',
                    }}>
                      {p.type_produit === 'medicament' ? '💊 Médicament' : '🧴 Parapharmacie'}
                    </span>
                    <span style={{
                      ...s.dispoBadge,
                      background: p.est_disponible ? '#dcfce7' : '#fee2e2',
                      color:      p.est_disponible ? '#15803d' : '#dc2626',
                    }}>
                      {p.est_disponible ? '✅ Dispo' : '❌ Indispo'}
                    </span>
                  </div>

                  <h4 style={s.produitNom}>{p.nom}</h4>

                  {/* Description perso en priorité, sinon admin */}
                  {(p.description_perso || p.description) && (
                    <p style={s.produitDesc}>
                      {p.description_perso
                        ? <><span style={{ fontSize: 11, color: '#008339', fontWeight: 700 }}>📝 Perso : </span>{p.description_perso}</>
                        : <><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>ℹ️ </span>{p.description}</>
                      }
                    </p>
                  )}

                  <div style={s.produitPrix}>
                    {p.prix
                      ? <span style={s.prix}>{parseFloat(p.prix).toFixed(2)} DA</span>
                      : <span style={s.prixNone}>Prix non renseigné</span>
                    }
                  </div>

                  <div style={s.produitActions}>
                    <button onClick={() => handleOpenModif(p)} style={s.btnModif}>✏️ Modifier</button>
                    <button onClick={() => handleDelete(p.pharmacie_produit_id, p.nom)} style={s.btnSuppr}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL AJOUT 2 ÉTAPES ── */}
      {showAjout && (
        <div style={s.overlay} onClick={() => etapeAjout === 1 && closeAjout()}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {etapeAjout === 2 && (
                  <button onClick={() => setEtapeAjout(1)} style={s.btnBack}>← Retour</button>
                )}
                <h3 style={s.modalTitle}>
                  {etapeAjout === 1 ? '🔍 Choisir des produits' : '⚙️ Configurer les produits'}
                </h3>
              </div>
              <button onClick={closeAjout} style={s.modalClose}>✕</button>
            </div>

            {/* Progress */}
            <div style={s.progressBar}>
              <div style={{ ...s.progressStep, background: '#008339', color: '#fff' }}>
                1 Sélection
              </div>
              <div style={{ ...s.progressLine, background: etapeAjout === 2 ? '#008339' : '#e5e7eb' }} />
              <div style={{
                ...s.progressStep,
                background: etapeAjout === 2 ? '#008339' : '#f3f4f6',
                color:      etapeAjout === 2 ? '#fff'    : '#9ca3af',
              }}>
                2 Configuration
              </div>
            </div>

            {/* ── ÉTAPE 1 : Sélection ── */}
            {etapeAjout === 1 && (
              <>
                <div style={s.searchBox}>
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Rechercher dans le catalogue..."
                    value={searchCat}
                    onChange={e => setSearchCat(e.target.value)}
                    style={s.searchInput}
                    autoFocus
                  />
                  {searchCat && (
                    <button onClick={() => setSearchCat('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>✕</button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
                  {[
                    { value: 'tous',          label: 'Tous'             },
                    { value: 'medicament',    label: '💊 Médicaments'   },
                    { value: 'parapharmacie', label: '🧴 Parapharmacie' },
                  ].map(f => (
                    <button key={f.value}
                      onClick={() => setFiltreCat(f.value)}
                      style={{ ...s.filtreBtn, ...(filtreCat === f.value ? s.filtreBtnActive : {}) }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {selection.length > 0 && (
                  <div style={s.selectionBar}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#008339' }}>
                      ✅ {selection.length} produit(s) sélectionné(s)
                    </span>
                    <button onClick={() => setSelection([])} style={s.btnClearSelection}>
                      Tout désélectionner
                    </button>
                  </div>
                )}

                <div style={s.catalogueList}>
                  {searchLoading ? (
                    <div style={s.center}>🔍 Recherche...</div>
                  ) : catalogue.length === 0 ? (
                    <div style={s.center}>Aucun produit trouvé dans le catalogue</div>
                  ) : catalogue.map(p => {
                    const selected = selection.find(sel => sel.admin_produit_id === p.admin_produit_id);
                    return (
                      <div
                        key={p.admin_produit_id}
                        onClick={() => handleToggleSelection(p)}
                        style={{
                          ...s.catalogueItem,
                          border:     selected ? '2px solid #008339' : '1.5px solid #e5e7eb',
                          background: selected ? '#f0fdf4'           : '#fff',
                          cursor: 'pointer',
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{p.nom}</span>
                            <span style={{
                              ...s.typeBadge, fontSize: 11,
                              background: p.type_produit === 'medicament' ? '#dbeafe' : '#fce7f3',
                              color:      p.type_produit === 'medicament' ? '#1d4ed8' : '#9d174d',
                            }}>
                              {p.type_produit === 'medicament' ? '💊' : '🧴'} {p.type_produit}
                            </span>
                          </div>
                          {p.description && (
                            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                              {p.description.substring(0, 80)}{p.description.length > 80 ? '...' : ''}
                            </p>
                          )}
                        </div>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: selected ? '#008339' : '#f3f4f6',
                          color:      selected ? '#fff'    : '#9ca3af',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
                        }}>
                          {selected ? '✓' : '+'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={closeAjout} style={s.btnCancel}>Annuler</button>
                  <button
                    onClick={() => setEtapeAjout(2)}
                    style={{ ...s.btnConfirm, opacity: selection.length === 0 ? 0.5 : 1 }}
                    disabled={selection.length === 0}>
                    Suivant ({selection.length}) →
                  </button>
                </div>
              </>
            )}

            {/* ── ÉTAPE 2 : Configuration ── */}
            {etapeAjout === 2 && (
              <>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                  Configurez chaque produit avant de l'ajouter.
                  <span style={{ color: '#ef4444' }}> Le prix est obligatoire.</span>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto' }}>
                  {selection.map((p, i) => (
                    <div key={p.admin_produit_id} style={s.configCard}>

                      {/* Header produit */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 15 }}>{p.nom}</span>
                            <span style={{
                              ...s.typeBadge, fontSize: 11,
                              background: p.type_produit === 'medicament' ? '#dbeafe' : '#fce7f3',
                              color:      p.type_produit === 'medicament' ? '#1d4ed8' : '#9d174d',
                            }}>
                              {p.type_produit === 'medicament' ? '💊' : '🧴'}
                            </span>
                          </div>
                          {p.description && (
                            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>ℹ️ {p.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleSelection(p)}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                          ✕ Retirer
                        </button>
                      </div>

                      {/* Prix */}
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>
                          💰 Prix (DA) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="ex: 450"
                          value={p.prix}
                          onChange={e => setSelection(prev => prev.map((sp, si) =>
                            si === i ? { ...sp, prix: e.target.value } : sp
                          ))}
                          style={{
                            ...s.formInput,
                            borderColor: !p.prix ? '#fca5a5' : '#e5e7eb',
                            background:  !p.prix ? '#fff5f5' : '#fff',
                          }}
                        />
                        {!p.prix && (
                          <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Prix obligatoire</p>
                        )}
                      </div>

                      {/* Description perso */}
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>
                          📝 Description personnelle <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optionnel)</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ajoutez une description personnelle..."
                          value={p.description_perso}
                          onChange={e => setSelection(prev => prev.map((sp, si) =>
                            si === i ? { ...sp, description_perso: e.target.value } : sp
                          ))}
                          style={{ ...s.formTextarea, fontSize: 13 }}
                        />
                      </div>

                      {/* Disponibilité */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Disponibilité</label>
                        <button
                          onClick={() => setSelection(prev => prev.map((sp, si) =>
                            si === i ? { ...sp, est_disponible: !sp.est_disponible } : sp
                          ))}
                          style={{
                            padding: '7px 16px', borderRadius: 8, border: '1.5px solid',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                            background:  p.est_disponible ? '#dcfce7' : '#fee2e2',
                            borderColor: p.est_disponible ? '#86efac' : '#fca5a5',
                            color:       p.est_disponible ? '#15803d' : '#dc2626',
                          }}>
                          {p.est_disponible ? '✅ Disponible' : '❌ Indisponible'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={() => setEtapeAjout(1)} style={s.btnCancel}>← Retour</button>
                  <button
                    onClick={handleAjout}
                    style={{
                      ...s.btnConfirm,
                      opacity: ajoutLoading || selection.some(p => !p.prix) ? 0.5 : 1
                    }}
                    disabled={ajoutLoading || selection.some(p => !p.prix)}>
                    {ajoutLoading ? 'Ajout en cours...' : `✅ Ajouter ${selection.length} produit(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL MODIFIER ── */}
      {modalModif && (
        <div style={s.overlay} onClick={() => setModalModif(null)}>
          <div style={{ ...s.modalBox, maxWidth: 440 }} onClick={e => e.stopPropagation()}>

            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>✏️ Modifier le produit</h3>
              <button onClick={() => setModalModif(null)} style={s.modalClose}>✕</button>
            </div>

            <div style={s.produitInfoBox}>
              <span style={{
                ...s.typeBadge,
                background: modalModif.type_produit === 'medicament' ? '#dbeafe' : '#fce7f3',
                color:      modalModif.type_produit === 'medicament' ? '#1d4ed8' : '#9d174d',
              }}>
                {modalModif.type_produit === 'medicament' ? '💊 Médicament' : '🧴 Parapharmacie'}
              </span>
              <h4 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
                {modalModif.nom}
              </h4>
              {modalModif.description && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>ℹ️ {modalModif.description}</p>
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>
                💰 Prix (DA) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                placeholder="ex: 450"
                value={modifData.prix}
                onChange={e => setModifData(d => ({ ...d, prix: e.target.value }))}
                style={{
                  ...s.formInput,
                  borderColor: !modifData.prix ? '#fca5a5' : '#e5e7eb',
                  background:  !modifData.prix ? '#fff5f5' : '#fff',
                }}
              />
              {!modifData.prix && (
                <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Prix obligatoire</p>
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>
                📝 Description personnelle <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Ajoutez une description personnelle..."
                value={modifData.description_perso}
                onChange={e => setModifData(d => ({ ...d, description_perso: e.target.value }))}
                style={s.formTextarea}
              />
            </div>

            <div style={s.toggleDispo}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Disponibilité</label>
              <button
                onClick={() => setModifData(d => ({ ...d, est_disponible: !d.est_disponible }))}
                style={{
                  ...s.toggleDispoBtn,
                  background:  modifData.est_disponible ? '#dcfce7' : '#fee2e2',
                  borderColor: modifData.est_disponible ? '#86efac' : '#fca5a5',
                  color:       modifData.est_disponible ? '#15803d' : '#dc2626',
                }}>
                {modifData.est_disponible ? '✅ Disponible' : '❌ Indisponible'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setModalModif(null)} style={s.btnCancel}>Annuler</button>
              <button
                onClick={handleModif}
                style={{ ...s.btnConfirm, opacity: modifLoading ? 0.6 : 1 }}
                disabled={modifLoading}>
                {modifLoading ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{ width: 48, height: 48, borderRadius: 13, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main: { marginLeft: 260, marginTop: 70, padding: 32, flex: 1 },

  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 },
  statCard:   { background: '#fff', borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },

  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle:  { fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 },
  btnAjouter: { padding: '11px 22px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },

  card:        { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  searchRow:   { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchBox:   { display: 'flex', alignItems: 'center', flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', gap: 8 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: 14 },

  filtreBtn:       { padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  filtreBtnActive: { background: '#008339', color: '#fff', border: '1.5px solid #008339' },

  produitsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 20 },
  produitCard:    { background: '#f8fafc', borderRadius: 14, padding: 20, border: '1.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 10 },
  produitHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  produitNom:     { fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 },
  produitDesc:    { fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 },
  produitPrix:    { marginTop: 4 },
  prix:           { fontSize: 18, fontWeight: 700, color: '#008339' },
  prixNone:       { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  produitActions: { display: 'flex', gap: 8, marginTop: 4 },
  btnModif:       { flex: 1, padding: '8px', background: '#e6f4ec', color: '#008339', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSuppr:       { padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },

  typeBadge:  { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  dispoBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },

  center: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: 14 },
  empty:  { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },

  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modalBox:    { background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 },
  modalClose:  { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' },

  progressBar:  { display: 'flex', alignItems: 'center', marginBottom: 20 },
  progressStep: { padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  progressLine: { flex: 1, height: 3, margin: '0 8px', transition: 'background 0.3s' },

  catalogueList:     { maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' },
  catalogueItem:     { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, transition: 'all 0.15s' },
  selectionBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e6f4ec', borderRadius: 10, padding: '10px 14px', marginBottom: 8 },
  btnClearSelection: { fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },

  configCard: { background: '#f8fafc', borderRadius: 12, padding: 18, border: '1.5px solid #e5e7eb' },

  produitInfoBox: { background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20 },
  formGroup:      { marginBottom: 14 },
  formLabel:      { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  formInput:      { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  formTextarea:   { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },

  toggleDispo:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggleDispoBtn: { padding: '8px 18px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },

  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnBack:    { padding: '6px 14px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' },
};