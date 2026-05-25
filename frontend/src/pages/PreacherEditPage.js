import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import PhotoCropper from '../components/PhotoCropper';
import './InscriptionPage.css';
import './PreacherEditPage.css';

export default function PreacherEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawPhoto, setRawPhoto] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    api.get(`/predicateurs/${id}`)
      .then(r => {
        setForm(r.data);
        if (r.data.photo) setPhotoPreview(r.data.photo.startsWith('http') ? r.data.photo : `/uploads/${r.data.photo}`);
      })
      .catch(() => { toast.error('Fiche introuvable'); navigate('/admin/predicateurs'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRawPhoto(URL.createObjectURL(file));
    setShowCropper(true);
    e.target.value = '';
  };

  const handleCropDone = (blob, previewUrl) => {
    setPhoto(blob);
    setPhotoPreview(previewUrl);
    setShowCropper(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      const skip = ['id', 'photo', 'created_at', 'updated_at', 'validated_at', 'validated_by',
                    'grade', 'ministere', 'date_ordination', 'lieu_ordination', 'formations', 'allergies',
                    'zone_affectation'];
      Object.entries(form).forEach(([k, v]) => {
        if (!skip.includes(k)) fd.append(k, v ?? '');
      });
      if (photo) fd.append('photo', photo, 'photo.jpg');

      await api.put(`/predicateurs/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Fiche mise à jour');
      navigate(`/admin/predicateurs/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Chargement...</div>;
  if (!form) return null;

  return (
    <div className="edit-page">
      {showCropper && (
        <PhotoCropper src={rawPhoto} onDone={handleCropDone} onCancel={() => setShowCropper(false)} />
      )}

      <div className="detail-topbar">
        <button className="btn-back" onClick={() => navigate(`/admin/predicateurs/${id}`)}>← Retour</button>
        <h1 className="edit-title">Modifier la fiche — {form.prenom} {form.nom}</h1>
      </div>

      <form onSubmit={handleSubmit} className="inscription-form edit-form">
        <h3 className="section-title">Identité</h3>
        <div className="form-grid">
          <div className="field-group"><label>Prénom <span className="required">*</span></label><input className="form-input" value={form.prenom || ''} onChange={set('prenom')} /></div>
          <div className="field-group"><label>Nom <span className="required">*</span></label><input className="form-input" value={form.nom || ''} onChange={set('nom')} /></div>
          <div className="field-group"><label>Date de naissance</label><input className="form-input" type="date" value={form.date_naissance || ''} onChange={set('date_naissance')} /></div>
          <div className="field-group"><label>Lieu de naissance</label><input className="form-input" value={form.lieu_naissance || ''} onChange={set('lieu_naissance')} /></div>
          <div className="field-group"><label>Nationalité</label><input className="form-input" value={form.nationalite || ''} onChange={set('nationalite')} /></div>
          <div className="field-group"><label>Situation matrimoniale</label>
            <select className="form-input" value={form.situation_matrimoniale || ''} onChange={set('situation_matrimoniale')}>
              <option value="">-</option>
              {['Célibataire','Marié(e)','Divorcé(e)','Veuf/Veuve'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field-group"><label>Téléphone 1</label><input className="form-input" value={form.telephone1 || ''} onChange={set('telephone1')} /></div>
          <div className="field-group"><label>Téléphone 2</label><input className="form-input" value={form.telephone2 || ''} onChange={set('telephone2')} /></div>
          <div className="field-group"><label>Email</label><input className="form-input" type="email" value={form.email || ''} onChange={set('email')} /></div>
        </div>
        <div className="field-group"><label>Adresse</label><textarea className="form-input" rows={3} value={form.adresse || ''} onChange={set('adresse')} /></div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Famille</h3>
        <div className="form-grid-3">
          <div className="field-group"><label>Père — Nom</label><input className="form-input" value={form.pere_nom || ''} onChange={set('pere_nom')} /></div>
          <div className="field-group"><label>Père — Téléphone</label><input className="form-input" value={form.pere_telephone || ''} onChange={set('pere_telephone')} /></div>
          <div className="field-group"><label>Père — Statut</label>
            <select className="form-input" value={form.pere_statut || ''} onChange={set('pere_statut')}>
              <option value="">-</option><option>Vivant</option><option>Décédé</option>
            </select>
          </div>
          <div className="field-group"><label>Mère — Nom</label><input className="form-input" value={form.mere_nom || ''} onChange={set('mere_nom')} /></div>
          <div className="field-group"><label>Mère — Téléphone</label><input className="form-input" value={form.mere_telephone || ''} onChange={set('mere_telephone')} /></div>
          <div className="field-group"><label>Mère — Statut</label>
            <select className="form-input" value={form.mere_statut || ''} onChange={set('mere_statut')}>
              <option value="">-</option><option>Vivant</option><option>Décédé</option>
            </select>
          </div>
          <div className="field-group"><label>Conjoint(e) — Nom</label><input className="form-input" value={form.conjoint_nom || ''} onChange={set('conjoint_nom')} /></div>
          <div className="field-group"><label>Conjoint(e) — Téléphone</label><input className="form-input" value={form.conjoint_telephone || ''} onChange={set('conjoint_telephone')} /></div>
          <div className="field-group"><label>Nombre d'enfants</label><input className="form-input" type="number" value={form.nombre_enfants || ''} onChange={set('nombre_enfants')} /></div>
        </div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Ecclésiastique</h3>
        <div className="form-grid">
          <div className="field-group"><label>Fonction</label>
            <select className="form-input" value={form.fonction || ''} onChange={set('fonction')}>
              <option value="">-</option>
              {['Pasteur','Évangéliste','Prophète','Apôtre','Prédicateur','Diacre','Ancien','Autre'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field-group"><label>Pays d'affectation</label><input className="form-input" value={form.pays_affectation || ''} onChange={set('pays_affectation')} placeholder="Ex: Côte d'Ivoire" /></div>
          <div className="field-group"><label>Église locale</label><input className="form-input" value={form.eglise_locale || ''} onChange={set('eglise_locale')} /></div>
          <div className="field-group"><label>Date de baptême</label><input className="form-input" type="date" value={form.date_bapteme || ''} onChange={set('date_bapteme')} /></div>
        </div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Contacts d'urgence & Médical</h3>
        <div className="form-grid-3">
          <div className="field-group"><label>Urgence 1 — Nom</label><input className="form-input" value={form.urgence1_nom || ''} onChange={set('urgence1_nom')} /></div>
          <div className="field-group"><label>Urgence 1 — Lien</label><input className="form-input" value={form.urgence1_lien || ''} onChange={set('urgence1_lien')} /></div>
          <div className="field-group"><label>Urgence 1 — Téléphone</label><input className="form-input" value={form.urgence1_telephone || ''} onChange={set('urgence1_telephone')} /></div>
          <div className="field-group"><label>Urgence 2 — Nom</label><input className="form-input" value={form.urgence2_nom || ''} onChange={set('urgence2_nom')} /></div>
          <div className="field-group"><label>Urgence 2 — Lien</label><input className="form-input" value={form.urgence2_lien || ''} onChange={set('urgence2_lien')} /></div>
          <div className="field-group"><label>Urgence 2 — Téléphone</label><input className="form-input" value={form.urgence2_telephone || ''} onChange={set('urgence2_telephone')} /></div>
        </div>
        <div className="form-grid">
          <div className="field-group"><label>Groupe sanguin</label>
            <select className="form-input" value={form.groupe_sanguin || ''} onChange={set('groupe_sanguin')}>
              <option value="">-</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-','Inconnu'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: 24 }}>Photo</h3>
        <div className="photo-upload-area">
          {photoPreview ? (
            <div className="photo-preview-wrap">
              <img src={photoPreview} alt="Aperçu" className="photo-preview" />
              <button type="button" className="btn-change-photo" onClick={() => fileRef.current?.click()}>Changer la photo</button>
            </div>
          ) : (
            <button type="button" className="photo-placeholder" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Ajouter / changer la photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        </div>

        <div className="form-actions" style={{ marginTop: 28 }}>
          <button type="button" className="btn-secondary" onClick={() => navigate(`/admin/predicateurs/${id}`)}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
