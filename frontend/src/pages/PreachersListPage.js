import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../AuthContext';
import './PreachersListPage.css';

const STATUT_LABELS = {
  en_attente: { label: 'En attente', cls: 'badge-warning' },
  valide:     { label: 'Validé',     cls: 'badge-success' },
  rejete:     { label: 'Rejeté',     cls: 'badge-danger'  },
};

export default function PreachersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [preachers, setPreachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  const search = searchParams.get('search') || '';
  const statut = searchParams.get('statut') || '';
  const zone   = searchParams.get('zone')   || '';

  const canValidate = ['superadmin', 'secretaire'].includes(user?.role);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statut) params.statut = statut;
      if (zone)   params.zone   = zone;
      const r = await api.get('/predicateurs', { params });
      setPreachers(r.data.data);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, statut, zone]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    setSearchParams(p);
    setPage(1);
  };

  const handleValidate = async (id, newStatut, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/predicateurs/${id}/statut`, { statut: newStatut });
      toast.success(newStatut === 'valide' ? 'Fiche validée' : 'Fiche rejetée');
      fetchList();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="list-page">
      <div className="list-header">
        <div>
          <h1>Prédicateurs</h1>
          <p className="page-subtitle">{total} fiche(s) au total</p>
        </div>
        <button
          className="btn-export"
          onClick={() => {
            const token = localStorage.getItem('mvm_token');
            const base = process.env.REACT_APP_API_URL || '';
            window.open(`${base}/api/predicateurs/export/csv?token=${token}`, '_blank');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exporter CSV
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher nom, téléphone, email..."
            value={search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <div className="filter-row">
          <select className="filter-select" value={statut} onChange={e => setFilter('statut', e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="valide">Validés</option>
            <option value="rejete">Rejetés</option>
          </select>
          <input
            className="filter-select"
            type="text"
            placeholder="Filtrer par pays..."
            value={zone}
            onChange={e => setFilter('zone', e.target.value)}
          />
          {(search || statut || zone) && (
            <button className="btn-clear" onClick={() => setSearchParams({})}>✕ Effacer</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Chargement...</div>
      ) : preachers.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>Aucun prédicateur trouvé</p>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="table-wrap desktop-only">
            <table className="preachers-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Nom complet</th>
                  <th>Téléphone</th>
                  <th>Fonction</th>
                  <th>Pays / Église</th>
                  <th>Statut</th>
                  {canValidate && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {preachers.map(p => {
                  const s = STATUT_LABELS[p.statut] || STATUT_LABELS.en_attente;
                  return (
                    <tr key={p.id} onClick={() => navigate(`/admin/predicateurs/${p.id}`)} className="clickable-row">
                      <td>
                        {p.photo
                          ? <img src={p.photo.startsWith('http') ? p.photo : `/uploads/${p.photo}`} alt="" className="list-photo" />
                          : <div className="list-avatar">{p.prenom?.charAt(0)}{p.nom?.charAt(0)}</div>
                        }
                      </td>
                      <td>
                        <div className="preacher-name">{p.prenom} {p.nom}</div>
                        <div className="preacher-email">{p.email}</div>
                      </td>
                      <td>{p.telephone1}</td>
                      <td>{p.fonction}</td>
                      <td>
                        <div>{p.pays_affectation}</div>
                        <div className="preacher-email">{p.eglise_locale}</div>
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      {canValidate && (
                        <td onClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            {p.statut !== 'valide' && (
                              <button className="btn-action btn-validate" title="Valider" onClick={e => handleValidate(p.id, 'valide', e)}>✓</button>
                            )}
                            {p.statut !== 'rejete' && (
                              <button className="btn-action btn-reject" title="Rejeter" onClick={e => handleValidate(p.id, 'rejete', e)}>✕</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="preacher-cards mobile-only">
            {preachers.map(p => {
              const s = STATUT_LABELS[p.statut] || STATUT_LABELS.en_attente;
              return (
                <div key={p.id} className="preacher-card" onClick={() => navigate(`/admin/predicateurs/${p.id}`)}>
                  <div className="pcard-photo">
                    {p.photo
                      ? <img src={p.photo.startsWith('http') ? p.photo : `/uploads/${p.photo}`} alt="" />
                      : <div className="pcard-avatar">{p.prenom?.charAt(0)}{p.nom?.charAt(0)}</div>
                    }
                  </div>
                  <div className="pcard-body">
                    <div className="pcard-name">{p.prenom} {p.nom}</div>
                    {p.telephone1 && <div className="pcard-meta">{p.telephone1}</div>}
                    {p.fonction && <div className="pcard-meta">{p.fonction}{p.pays_affectation ? ` · ${p.pays_affectation}` : ''}</div>}
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                  {canValidate && (
                    <div className="pcard-actions" onClick={e => e.stopPropagation()}>
                      {p.statut !== 'valide' && (
                        <button className="btn-action btn-validate" title="Valider" onClick={e => handleValidate(p.id, 'valide', e)}>✓</button>
                      )}
                      {p.statut !== 'rejete' && (
                        <button className="btn-action btn-reject" title="Rejeter" onClick={e => handleValidate(p.id, 'rejete', e)}>✕</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Préc.</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suiv. →</button>
        </div>
      )}
    </div>
  );
}
