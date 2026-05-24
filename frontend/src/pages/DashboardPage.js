import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './DashboardPage.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/predicateurs/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble des prédicateurs MVM</p>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total inscrits"
          value={stats?.total ?? 0}
          color="primary"
          icon={<PeopleIcon />}
          onClick={() => navigate('/admin/predicateurs')}
        />
        <StatCard
          label="En attente"
          value={stats?.en_attente ?? 0}
          color="warning"
          icon={<ClockIcon />}
          onClick={() => navigate('/admin/predicateurs?statut=en_attente')}
        />
        <StatCard
          label="Validés"
          value={stats?.valide ?? 0}
          color="success"
          icon={<CheckIcon />}
          onClick={() => navigate('/admin/predicateurs?statut=valide')}
        />
        <StatCard
          label="Zones actives"
          value={stats?.zones?.length ?? 0}
          color="info"
          icon={<MapIcon />}
        />
      </div>

      {stats?.zones?.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-heading">Répartition par pays d'affectation</h2>
          <div className="zones-table-wrap">
            <table className="zones-table">
              <thead>
                <tr>
                  <th>Pays</th>
                  <th>Nombre de prédicateurs</th>
                  <th>Part</th>
                </tr>
              </thead>
              <tbody>
                {stats.zones.map(z => (
                  <tr key={z.pays_affectation} onClick={() => navigate(`/admin/predicateurs?zone=${encodeURIComponent(z.pays_affectation)}`)}>
                    <td>{z.pays_affectation}</td>
                    <td>{z.cnt}</td>
                    <td>
                      <div className="zone-bar-wrap">
                        <div className="zone-bar" style={{ width: `${Math.round((z.cnt / stats.total) * 100)}%` }} />
                        <span>{Math.round((z.cnt / stats.total) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dashboard-actions">
        <button className="action-card" onClick={() => navigate('/admin/predicateurs?statut=en_attente')}>
          <ClockIcon />
          <div>
            <strong>Valider les inscriptions</strong>
            <span>{stats?.en_attente ?? 0} fiche(s) en attente</span>
          </div>
        </button>
        <a className="action-card" href="/api/predicateurs/export/csv" download>
          <DownloadIcon />
          <div>
            <strong>Exporter CSV</strong>
            <span>Télécharger toutes les fiches</span>
          </div>
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, onClick }) {
  return (
    <div className={`stat-card stat-${color} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function MapIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
}
function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
