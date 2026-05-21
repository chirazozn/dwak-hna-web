import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import SidebarPharmacie from '../../components/SidebarPharmacie';
import NavbarPharmacie  from '../../components/NavbarPharmacie';
import Toast from '../../components/Toast';

const API      = 'http://127.0.0.1:5000/api/pharmacie';
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

const PIE_COLORS = ['#008339', '#ef4444', '#f59e0b'];

export default function PharmacieDashboard() {
  const navigate = useNavigate();

  const [statut,    setStatut]    = useState('en_attente');
  const [stats,     setStats]     = useState(null);
  const [pharmacie, setPharmacie] = useState(null);
  const [dernières, setDernières] = useState([]);
  const [charts,    setCharts]    = useState({
    demandes_par_mois: [],
    reponses_chart:    [],
  });
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState({ text: '', type: '' });

  const prevStatutRef  = useRef('en_attente');
  const isFirstRef     = useRef(true);
  const isMountedRef   = useRef(false);
  const pollRef        = useRef(null);

  const showToast = (text, type) => setToast({ text, type });

  const fetchDashboard = async () => {
    if (!isMountedRef.current) setLoading(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }

      const res       = await axios.get(`${API}/dashboard`, { headers: headers() });
      const newStatut = res.data.pharmacie?.statut || 'en_attente';

      if (!isFirstRef.current) {
        if (prevStatutRef.current !== 'approuvee' && newStatut === 'approuvee') {
          playSound();
          showToast('🎉 Votre compte a été approuvé !', 'success');
        }
        if (prevStatutRef.current === 'approuvee' && newStatut === 'suspendue') {
          showToast('🚫 Votre compte a été suspendu.', 'error');
        }
      }

      isFirstRef.current    = false;
      isMountedRef.current  = true;
      prevStatutRef.current = newStatut;

      setStatut(newStatut);
      setStats(res.data.stats);
      setPharmacie(res.data.pharmacie);
      setDernières(res.data.dernieres_demandes || []);
      setCharts({
        demandes_par_mois: res.data.demandes_par_mois || [],
        reponses_chart:    res.data.reponses_chart    || [],
      });
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const estApprouve = statut === 'approuvee';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ color: '#6b7280', fontSize: 16, fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
      </div>
    </div>
  );

  const STATUT_CONFIG = {
    en_attente: { bg: '#fef3c7', color: '#d97706', label: '⏳ En attente' },
    acceptee:   { bg: '#dcfce7', color: '#15803d', label: '✅ Acceptée'   },
    refusee:    { bg: '#fee2e2', color: '#dc2626', label: '❌ Refusée'    },
  };

  return (
    <div style={s.root}>
      <SidebarPharmacie estApprouve={estApprouve} pharmacie={pharmacie} />
      <NavbarPharmacie  estApprouve={estApprouve} pharmacie={pharmacie} title="Dashboard" />

      <Toast message={toast.text} type={toast.type} onClose={() => setToast({ text: '', type: '' })} />

      <main style={s.main}>

        {/* ── BANNIÈRE STATUT ── */}
        {!estApprouve && (
          <div style={{
            ...s.banner,
            background:  statut === 'suspendue' ? '#fee2e2' : '#fef3c7',
            borderColor: statut === 'suspendue' ? '#fca5a5' : '#fcd34d',
          }}>
            <div style={s.bannerLeft}>
              <span style={{ fontSize: 36 }}>
                {statut === 'suspendue' ? '🚫' : '⏳'}
              </span>
              <div>
                <h3 style={{ ...s.bannerTitle, color: statut === 'suspendue' ? '#dc2626' : '#92400e' }}>
                  {statut === 'suspendue' ? 'Compte suspendu' : "En attente d'approbation"}
                </h3>
                <p style={{ ...s.bannerText, color: statut === 'suspendue' ? '#ef4444' : '#b45309' }}>
                  {statut === 'suspendue'
                    ? "Votre compte a été suspendu. Contactez l'administration."
                    : "Notre équipe vérifie vos documents. Vous serez notifié automatiquement dès approbation."}
                </p>
              </div>
            </div>
            {statut === 'en_attente' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#d97706',
                    animation: 'bounce 1.4s infinite ease-in-out both',
                    animationDelay: `${d}s`,
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONTENU ── */}
        <div style={{ position: 'relative' }}>

          {/* OVERLAY CADENAS */}
          {!estApprouve && (
            <div style={s.overlay}>
              <div style={s.lockBox}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🔒</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
                  Accès restreint
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, textAlign: 'center' }}>
                  {statut === 'suspendue'
                    ? "Compte suspendu par l'administration"
                    : "En attente d'approbation admin"}
                </p>
                {statut === 'en_attente' && (
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    🔄 Vérification automatique toutes les 5 secondes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STAT CARDS */}
          <div style={{ ...s.statsGrid, filter: estApprouve ? 'none' : 'blur(4px)' }}>
            <StatCard icon="📋" label="Total demandes"  value={stats?.total_demandes  ?? 0} accent="#008339" />
            <StatCard icon="✅" label="Acceptées"       value={stats?.acceptees       ?? 0} accent="#15803d" />
            <StatCard icon="❌" label="Refusées"        value={stats?.refusees        ?? 0} accent="#dc2626" />
            <StatCard icon="⏳" label="En attente"      value={stats?.en_attente      ?? 0} accent="#d97706" />
            <StatCard icon="⭐" label="Note moyenne"
              value={stats?.note_moyenne ? `${stats.note_moyenne}/5` : '—'}
              accent="#f59e0b" />
            <StatCard icon="🏆" label="Fois choisie"   value={stats?.nb_fois_choisie ?? 0} accent="#8b5cf6" />
          </div>

          {/* GRAPHIQUES */}
          {estApprouve && (
            <>
              <div style={s.chartsRow}>

                {/* Demandes par mois */}
                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>📈 Demandes reçues par mois</h3>
                  {charts.demandes_par_mois.length === 0 ? (
                    <div style={s.noData}>Pas encore de données</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={charts.demandes_par_mois}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone" dataKey="total"
                          stroke="#008339" strokeWidth={3}
                          dot={{ fill: '#008339', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Réponses pie */}
                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>📊 Mes réponses</h3>
                  {charts.reponses_chart.length === 0 || charts.reponses_chart.every(r => r.value === 0) ? (
                    <div style={s.noData}>Pas encore de réponses</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={charts.reponses_chart}
                          cx="50%" cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {charts.reponses_chart.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Dernières demandes */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>📋 Dernières demandes reçues</h3>
                  <button onClick={() => navigate('/pharmacie/demandes')} style={s.btnVoirTout}>
                    Voir tout →
                  </button>
                </div>

                {dernières.length === 0 ? (
                  <div style={s.noData}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                    <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
                      Aucune demande reçue pour le moment
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {['Patient', 'Type', 'Mon statut', 'Date'].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dernières.map((d, i) => {
                          const sc = STATUT_CONFIG[d.ma_reponse] || STATUT_CONFIG.en_attente;
                          return (
                            <tr key={d.demande_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                              <td style={s.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: '#008339', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                                  }}>
                                    {d.patient.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>
                                    {d.patient}
                                  </span>
                                </div>
                              </td>
                              <td style={s.td}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  background: d.type === 'ordonnance' ? '#fce7f3' : '#dbeafe',
                                  color:      d.type === 'ordonnance' ? '#9d174d' : '#1d4ed8',
                                }}>
                                  {d.type === 'ordonnance' ? '📋 Ordonnance' : '✍️ Manuelle'}
                                </span>
                              </td>
                              <td style={s.td}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  background: sc.bg, color: sc.color,
                                }}>
                                  {sc.label}
                                </span>
                              </td>
                              <td style={{ ...s.td, color: '#6b7280', fontSize: 13 }}>{d.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0);  }
          40%           { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: accent + '18', color: accent,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1f2937' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main: { marginLeft: 260, marginTop: 70, padding: 32, flex: 1 },

  banner:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: '20px 24px', marginBottom: 28, border: '1px solid' },
  bannerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  bannerTitle:{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' },
  bannerText: { fontSize: 13, margin: 0, maxWidth: 450, lineHeight: 1.5 },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 },
  statCard:  { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },

  overlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lockBox: { background: '#fff', borderRadius: 20, padding: '36px 48px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center' },

  chartsRow: { display: 'flex', gap: 24, marginBottom: 24 },
  chartCard: { background: '#fff', borderRadius: 16, padding: 24, flex: 1, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', minWidth: 0 },
  chartTitle:{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16, marginTop: 0 },
  noData:    { textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 },

  card:       { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle:  { fontSize: 17, fontWeight: 700, color: '#1f2937', margin: 0 },
  btnVoirTout:{ padding: '8px 16px', background: '#e6f4ec', color: '#008339', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 500 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },
};