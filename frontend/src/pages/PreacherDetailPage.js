import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import { useAuth } from '../AuthContext';
import './PreacherDetailPage.css';

const STATUT_LABELS = {
  en_attente: { label: 'En attente', cls: 'badge-warning' },
  valide: { label: 'Validé', cls: 'badge-success' },
  rejete: { label: 'Rejeté', cls: 'badge-danger' },
};

export default function PreacherDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const canValidate = ['superadmin', 'secretaire'].includes(user?.role);
  const canEdit = ['superadmin', 'secretaire'].includes(user?.role);
  const canDelete = user?.role === 'superadmin';

  useEffect(() => {
    api.get(`/predicateurs/${id}`)
      .then(r => setData(r.data))
      .catch(() => { toast.error('Fiche introuvable'); navigate('/admin/predicateurs'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStatut = async (statut) => {
    try {
      await api.patch(`/predicateurs/${id}/statut`, { statut });
      setData(d => ({ ...d, statut }));
      toast.success(statut === 'valide' ? 'Fiche validée ✓' : statut === 'rejete' ? 'Fiche rejetée' : 'Statut mis à jour');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement cette fiche ?')) return;
    try {
      await api.delete(`/predicateurs/${id}`);
      toast.success('Fiche supprimée');
      navigate('/admin/predicateurs');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="page-loading">Chargement...</div>;
  if (!data) return null;

  const s = STATUT_LABELS[data.statut] || STATUT_LABELS.en_attente;
  const fullName = `${data.prenom} ${data.nom}`;

  return (
    <div className="detail-page">
      <div className="detail-topbar">
        <button className="btn-back" onClick={() => navigate('/admin/predicateurs')}>← Retour</button>
        <div className="detail-actions">
          {canValidate && data.statut === 'en_attente' && (
            <>
              <button className="btn-action-lg btn-validate" onClick={() => handleStatut('valide')}>✓ Valider</button>
              <button className="btn-action-lg btn-reject" onClick={() => handleStatut('rejete')}>✕ Rejeter</button>
            </>
          )}
          {canValidate && data.statut === 'rejete' && (
            <button className="btn-action-lg btn-validate" onClick={() => handleStatut('valide')}>✓ Valider quand même</button>
          )}
          {canEdit && (
            <button className="btn-action-lg btn-edit" onClick={() => navigate(`/admin/predicateurs/${id}/edit`)}>
              ✎ Modifier
            </button>
          )}
          {canDelete && (
            <button className="btn-action-lg btn-delete" onClick={handleDelete}>🗑 Supprimer</button>
          )}
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-hero">
          <div className="hero-photo-wrap">
            {data.photo
              ? <img src={data.photo.startsWith('http') ? data.photo : `/uploads/${data.photo}`} alt={fullName} className="hero-photo" />
              : <div className="hero-avatar">{data.prenom?.charAt(0)}{data.nom?.charAt(0)}</div>
            }
          </div>
          <div className="hero-info">
            <h1 className="hero-name">{fullName}</h1>
            <div className="hero-meta">
              <span>{data.fonction}</span>
              {data.grade && <><span className="meta-sep">•</span><span>{data.grade}</span></>}
              {data.ministere && <><span className="meta-sep">•</span><span>{data.ministere}</span></>}
            </div>
            <div className="hero-church">
              {data.eglise_locale && <span>{data.eglise_locale}</span>}
              {data.pays_affectation && <span className="zone-tag">{data.pays_affectation}</span>}
            </div>
            <span className={`badge ${s.cls}`} style={{ marginTop: 8 }}>{s.label}</span>
          </div>
        </div>
      </div>

      <div className="detail-sections">
        <InfoSection title="Identité">
          <InfoRow label="Date de naissance" value={data.date_naissance} />
          <InfoRow label="Lieu de naissance" value={data.lieu_naissance} />
          <InfoRow label="Nationalité" value={data.nationalite} />
          <InfoRow label="Situation matrimoniale" value={data.situation_matrimoniale} />
          <InfoRow label="Téléphone 1" value={data.telephone1} />
          <InfoRow label="Téléphone 2" value={data.telephone2} />
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="Adresse" value={data.adresse} fullWidth />
        </InfoSection>

        <InfoSection title="Famille">
          <InfoRow label="Père" value={data.pere_nom} />
          <InfoRow label="Tél. père" value={data.pere_telephone} />
          <InfoRow label="Statut père" value={data.pere_statut} />
          <InfoRow label="Mère" value={data.mere_nom} />
          <InfoRow label="Tél. mère" value={data.mere_telephone} />
          <InfoRow label="Statut mère" value={data.mere_statut} />
          <InfoRow label="Conjoint(e)" value={data.conjoint_nom} />
          <InfoRow label="Tél. conjoint(e)" value={data.conjoint_telephone} />
          <InfoRow label="Nombre d'enfants" value={data.nombre_enfants} />
        </InfoSection>

        <InfoSection title="Ecclésiastique">
          <InfoRow label="Fonction" value={data.fonction} />
          <InfoRow label="Pays d'affectation" value={data.pays_affectation} />
          <InfoRow label="Église locale" value={data.eglise_locale} />
          <InfoRow label="Date de baptême" value={data.date_bapteme} />
        </InfoSection>

        <InfoSection title="Contacts d'urgence & Médical">
          <InfoRow label="Urgence 1" value={data.urgence1_nom} />
          <InfoRow label="Lien 1" value={data.urgence1_lien} />
          <InfoRow label="Tél. urgence 1" value={data.urgence1_telephone} />
          <InfoRow label="Urgence 2" value={data.urgence2_nom} />
          <InfoRow label="Lien 2" value={data.urgence2_lien} />
          <InfoRow label="Tél. urgence 2" value={data.urgence2_telephone} />
          <InfoRow label="Groupe sanguin" value={data.groupe_sanguin} />
        </InfoSection>
      </div>

      <div className="detail-meta-footer">
        Inscription le {new Date(data.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
        {data.validated_at && ` • Validé le ${new Date(data.validated_at).toLocaleDateString('fr-FR')}`}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div className="info-section">
      <h2 className="info-section-title">{title}</h2>
      <div className="info-grid">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, fullWidth }) {
  if (!value && value !== 0) return null;
  return (
    <div className={`info-row ${fullWidth ? 'full-width' : ''}`}>
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}
