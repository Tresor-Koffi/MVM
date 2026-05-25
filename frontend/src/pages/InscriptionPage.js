import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api';
import PhotoCropper from '../components/PhotoCropper';
import './InscriptionPage.css';

const INITIAL_FORM = {
  // Identité
  prenom: '', nom: '', date_naissance: '', lieu_naissance: '',
  nationalite: '', situation_matrimoniale: '', telephone1: '',
  telephone2: '', email: '', adresse: '',
  // Famille
  pere_nom: '', pere_telephone: '', pere_statut: '',
  mere_nom: '', mere_telephone: '', mere_statut: '',
  conjoint_nom: '', conjoint_telephone: '', nombre_enfants: '',
  // Ecclésiastique
  fonction: '', pays_affectation: '', eglise_locale: '', date_bapteme: '',
  // Urgence
  urgence1_nom: '', urgence1_lien: '', urgence1_telephone: '',
  urgence2_nom: '', urgence2_lien: '', urgence2_telephone: '',
  groupe_sanguin: '',
};

const STEPS = ['Identité', 'Famille', 'Ecclésiastique', 'Urgence & Photo'];

export default function InscriptionPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [rawPhoto, setRawPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawPhoto(url);
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
    if (!form.prenom || !form.nom) {
      toast.error('Prénom et nom obligatoires');
      setStep(0);
      return;
    }
    if (!form.telephone1) {
      toast.error('Le numéro de téléphone principal est obligatoire');
      setStep(0);
      return;
    }
    if (!photo) {
      toast.error('La photo est obligatoire');
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('photo', photo, 'photo.jpg');

      await api.post('/predicateurs/inscription', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409) {
        toast.error(data?.error || 'Ce prédicateur est déjà enregistré');
        if (data?.field === 'telephone1' || data?.field === 'email') setStep(0);
      } else {
        toast.error(data?.error || "Erreur lors de l'envoi. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="inscription-page">
        <div className="inscription-success">
          <div className="success-icon">✓</div>
          <h2>Inscription soumise avec succès !</h2>
          <p>Votre dossier a été enregistré et est en attente de validation par l'administration MVM.</p>
          <p>Vous serez contacté(e) une fois votre fiche validée.</p>
          <button className="btn-primary" onClick={() => { setForm(INITIAL_FORM); setSubmitted(false); setStep(0); setPhoto(null); setPhotoPreview(null); }}>
            Nouvelle inscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inscription-page">
      {showCropper && (
        <PhotoCropper
          src={rawPhoto}
          onDone={handleCropDone}
          onCancel={() => setShowCropper(false)}
        />
      )}

      <header className="inscription-header">
        <div className="header-brand">
          <span className="brand-badge">MVM</span>
          <span>Formulaire d'inscription — Prédicateurs</span>
        </div>
        <a href="/admin/login" className="admin-link">Espace admin →</a>
      </header>

      <div className="inscription-container">
        <div className="steps-bar">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="inscription-form">
          {step === 0 && <StepIdentite form={form} set={set} />}
          {step === 1 && <StepFamille form={form} set={set} />}
          {step === 2 && <StepEcclesiastique form={form} set={set} />}
          {step === 3 && (
            <StepUrgencePhoto
              form={form} set={set}
              photoPreview={photoPreview}
              fileRef={fileRef}
              onPhotoChange={handlePhotoChange}
            />
          )}

          <div className="form-actions">
            {step > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>
                ← Précédent
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setStep(s => s + 1)}>
                Suivant →
              </button>
            ) : (
              <button type="submit" className="btn-primary btn-submit" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Soumettre la fiche'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="field-group">
      <label>{label}{required && <span className="required">*</span>}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return <input className="form-input" type={type} value={value} onChange={onChange} placeholder={placeholder} />;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className="form-input" value={value} onChange={onChange}>
      <option value="">{placeholder || 'Sélectionner...'}</option>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

function SectionTitle({ title }) {
  return <h3 className="section-title">{title}</h3>;
}

function StepIdentite({ form, set }) {
  return (
    <>
      <SectionTitle title="Informations personnelles" />
      <div className="form-grid">
        <Field label="Prénom" required><Input value={form.prenom} onChange={set('prenom')} placeholder="Prénom" /></Field>
        <Field label="Nom" required><Input value={form.nom} onChange={set('nom')} placeholder="Nom de famille" /></Field>
        <Field label="Date de naissance"><Input type="date" value={form.date_naissance} onChange={set('date_naissance')} /></Field>
        <Field label="Lieu de naissance"><Input value={form.lieu_naissance} onChange={set('lieu_naissance')} placeholder="Ville, Pays" /></Field>
        <Field label="Nationalité"><Input value={form.nationalite} onChange={set('nationalite')} placeholder="Ex: Ivoirienne" /></Field>
        <Field label="Situation matrimoniale">
          <Select value={form.situation_matrimoniale} onChange={set('situation_matrimoniale')}
            options={['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']} />
        </Field>
        <Field label="Téléphone principal" required><Input value={form.telephone1} onChange={set('telephone1')} placeholder="+225..." type="tel" /></Field>
        <Field label="Téléphone secondaire"><Input value={form.telephone2} onChange={set('telephone2')} placeholder="+225..." type="tel" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="exemple@email.com" /></Field>
      </div>
      <Field label="Adresse complète">
        <textarea className="form-input" rows={3} value={form.adresse} onChange={set('adresse')} placeholder="Quartier, ville, pays..." />
      </Field>
    </>
  );
}

function StepFamille({ form, set }) {
  return (
    <>
      <SectionTitle title="Informations familiales" />
      <div className="form-subsection">
        <h4 className="subsection-label">Père</h4>
        <div className="form-grid-3">
          <Field label="Nom du père"><Input value={form.pere_nom} onChange={set('pere_nom')} placeholder="Nom complet" /></Field>
          <Field label="Téléphone"><Input value={form.pere_telephone} onChange={set('pere_telephone')} placeholder="+225..." type="tel" /></Field>
          <Field label="Statut">
            <Select value={form.pere_statut} onChange={set('pere_statut')} options={['Vivant', 'Décédé']} />
          </Field>
        </div>
      </div>
      <div className="form-subsection">
        <h4 className="subsection-label">Mère</h4>
        <div className="form-grid-3">
          <Field label="Nom de la mère"><Input value={form.mere_nom} onChange={set('mere_nom')} placeholder="Nom complet" /></Field>
          <Field label="Téléphone"><Input value={form.mere_telephone} onChange={set('mere_telephone')} placeholder="+225..." type="tel" /></Field>
          <Field label="Statut">
            <Select value={form.mere_statut} onChange={set('mere_statut')} options={['Vivant', 'Décédé']} />
          </Field>
        </div>
      </div>
      <div className="form-subsection">
        <h4 className="subsection-label">Conjoint(e)</h4>
        <div className="form-grid">
          <Field label="Nom du/de la conjoint(e)"><Input value={form.conjoint_nom} onChange={set('conjoint_nom')} placeholder="Nom complet" /></Field>
          <Field label="Téléphone"><Input value={form.conjoint_telephone} onChange={set('conjoint_telephone')} placeholder="+225..." type="tel" /></Field>
        </div>
      </div>
      <div style={{ maxWidth: 200 }}>
        <Field label="Nombre d'enfants">
          <Input type="number" value={form.nombre_enfants} onChange={set('nombre_enfants')} placeholder="0" />
        </Field>
      </div>
    </>
  );
}

function StepEcclesiastique({ form, set }) {
  return (
    <>
      <SectionTitle title="Informations ecclésiastiques" />
      <div className="form-grid">
        <Field label="Fonction">
          <Select value={form.fonction} onChange={set('fonction')}
            options={['Pasteur', 'Évangéliste', 'Prophète', 'Apôtre', 'Prédicateur', 'Diacre', 'Ancien', 'Autre']} />
        </Field>
        <Field label="Pays d'affectation"><Input value={form.pays_affectation} onChange={set('pays_affectation')} placeholder="Ex: Côte d'Ivoire" /></Field>
        <Field label="Église locale"><Input value={form.eglise_locale} onChange={set('eglise_locale')} placeholder="Nom de l'église" /></Field>
        <Field label="Date de baptême"><Input type="date" value={form.date_bapteme} onChange={set('date_bapteme')} /></Field>
      </div>
    </>
  );
}

function StepUrgencePhoto({ form, set, photoPreview, fileRef, onPhotoChange }) {
  return (
    <>
      <SectionTitle title="Contacts d'urgence" />
      <div className="form-subsection">
        <h4 className="subsection-label">Contact 1</h4>
        <div className="form-grid-3">
          <Field label="Nom"><Input value={form.urgence1_nom} onChange={set('urgence1_nom')} placeholder="Nom complet" /></Field>
          <Field label="Lien"><Input value={form.urgence1_lien} onChange={set('urgence1_lien')} placeholder="Ex: Frère, Épouse..." /></Field>
          <Field label="Téléphone"><Input value={form.urgence1_telephone} onChange={set('urgence1_telephone')} placeholder="+225..." type="tel" /></Field>
        </div>
      </div>
      <div className="form-subsection">
        <h4 className="subsection-label">Contact 2</h4>
        <div className="form-grid-3">
          <Field label="Nom"><Input value={form.urgence2_nom} onChange={set('urgence2_nom')} placeholder="Nom complet" /></Field>
          <Field label="Lien"><Input value={form.urgence2_lien} onChange={set('urgence2_lien')} placeholder="Ex: Parent, Ami..." /></Field>
          <Field label="Téléphone"><Input value={form.urgence2_telephone} onChange={set('urgence2_telephone')} placeholder="+225..." type="tel" /></Field>
        </div>
      </div>

      <SectionTitle title="Informations médicales" />
      <div style={{ maxWidth: 220 }}>
        <Field label="Groupe sanguin">
          <Select value={form.groupe_sanguin} onChange={set('groupe_sanguin')}
            options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Inconnu']} />
        </Field>
      </div>

      <SectionTitle title="Photo d'identité" />
      <p className="photo-required-note">La photo est obligatoire <span className="required">*</span></p>
      <div className="photo-upload-area">
        {photoPreview ? (
          <div className="photo-preview-wrap">
            <img src={photoPreview} alt="Aperçu" className="photo-preview" />
            <button type="button" className="btn-change-photo" onClick={() => fileRef.current?.click()}>
              Changer la photo
            </button>
          </div>
        ) : (
          <button type="button" className="photo-placeholder" onClick={() => fileRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Cliquer pour ajouter une photo</span>
            <small>Format portrait recommandé • Max 5 Mo</small>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }} />
      </div>
    </>
  );
}
