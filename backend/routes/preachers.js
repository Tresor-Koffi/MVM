const express = require('express');
const path = require('path');
const fs = require('fs');
const { dbRun, dbGet, dbAll } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, processPhoto } = require('../utils/upload');

const router = express.Router();

// Public: submit registration
router.post('/inscription', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;
    const photoPath = req.file ? await processPhoto(req.file) : null;

    const result = await dbRun(`
      INSERT INTO preachers (
        prenom, nom, date_naissance, lieu_naissance, nationalite, situation_matrimoniale,
        telephone1, telephone2, email, adresse,
        pere_nom, pere_telephone, pere_statut,
        mere_nom, mere_telephone, mere_statut,
        conjoint_nom, conjoint_telephone, nombre_enfants,
        fonction, pays_affectation, eglise_locale, date_bapteme,
        urgence1_nom, urgence1_lien, urgence1_telephone,
        urgence2_nom, urgence2_lien, urgence2_telephone,
        groupe_sanguin, photo, statut
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,
        ?,?,?,?,
        ?,?,?,?,?,?,
        ?,?,'en_attente'
      )`,
      [
        data.prenom, data.nom, data.date_naissance || null, data.lieu_naissance || null,
        data.nationalite || null, data.situation_matrimoniale || null,
        data.telephone1 || null, data.telephone2 || null, data.email || null, data.adresse || null,
        data.pere_nom || null, data.pere_telephone || null, data.pere_statut || null,
        data.mere_nom || null, data.mere_telephone || null, data.mere_statut || null,
        data.conjoint_nom || null, data.conjoint_telephone || null, parseInt(data.nombre_enfants) || 0,
        data.fonction || null, data.pays_affectation || null, data.eglise_locale || null, data.date_bapteme || null,
        data.urgence1_nom || null, data.urgence1_lien || null, data.urgence1_telephone || null,
        data.urgence2_nom || null, data.urgence2_lien || null, data.urgence2_telephone || null,
        data.groupe_sanguin || null, photoPath,
      ]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
  }
});

// Admin: stats for dashboard (before /:id)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalRow = await dbGet('SELECT COUNT(*) as cnt FROM preachers', []);
    const enAttenteRow = await dbGet("SELECT COUNT(*) as cnt FROM preachers WHERE statut = 'en_attente'", []);
    const valideRow = await dbGet("SELECT COUNT(*) as cnt FROM preachers WHERE statut = 'valide'", []);
    const zones = await dbAll(
      "SELECT pays_affectation, COUNT(*) as cnt FROM preachers WHERE pays_affectation IS NOT NULL AND pays_affectation != '' GROUP BY pays_affectation ORDER BY cnt DESC",
      []
    );
    res.json({ total: totalRow.cnt, en_attente: enAttenteRow.cnt, valide: valideRow.cnt, zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: CSV export (before /:id)
router.get('/export/csv', requireAuth, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM preachers ORDER BY created_at DESC', []);

    const headers = [
      'ID', 'Prénom', 'Nom', 'Date Naissance', 'Lieu Naissance', 'Nationalité',
      'Situation Matrimoniale', 'Téléphone 1', 'Téléphone 2', 'Email', 'Adresse',
      'Père Nom', 'Père Téléphone', 'Père Statut',
      'Mère Nom', 'Mère Téléphone', 'Mère Statut',
      'Conjoint Nom', 'Conjoint Téléphone', 'Nombre Enfants',
      'Fonction', 'Pays Affectation', 'Eglise Locale', 'Date Baptême',
      'Urgence 1 Nom', 'Urgence 1 Lien', 'Urgence 1 Téléphone',
      'Urgence 2 Nom', 'Urgence 2 Lien', 'Urgence 2 Téléphone',
      'Groupe Sanguin', 'Statut', 'Date Inscription',
    ];

    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        r.id, r.prenom, r.nom, r.date_naissance, r.lieu_naissance, r.nationalite,
        r.situation_matrimoniale, r.telephone1, r.telephone2, r.email, r.adresse,
        r.pere_nom, r.pere_telephone, r.pere_statut,
        r.mere_nom, r.mere_telephone, r.mere_statut,
        r.conjoint_nom, r.conjoint_telephone, r.nombre_enfants,
        r.fonction, r.pays_affectation, r.eglise_locale, r.date_bapteme,
        r.urgence1_nom, r.urgence1_lien, r.urgence1_telephone,
        r.urgence2_nom, r.urgence2_lien, r.urgence2_telephone,
        r.groupe_sanguin, r.statut, r.created_at,
      ].map(escape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="predicateurs_mvm.csv"');
    res.send('﻿' + lines.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur export' });
  }
});

// Admin: list preachers
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, statut, zone, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = [];
    const params = [];

    if (search) {
      where.push('(prenom LIKE ? OR nom LIKE ? OR email LIKE ? OR telephone1 LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (statut) { where.push('statut = ?'); params.push(statut); }
    if (zone)   { where.push('pays_affectation = ?'); params.push(zone); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = await dbGet(`SELECT COUNT(*) as cnt FROM preachers ${whereClause}`, params);
    const rows = await dbAll(
      `SELECT id, prenom, nom, email, telephone1, fonction, pays_affectation,
              eglise_locale, statut, photo, created_at
       FROM preachers ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, total: countRow.cnt, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: get one preacher
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM preachers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Prédicateur introuvable' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: validate/reject
router.patch('/:id/statut', requireAuth, requireRole('superadmin', 'secretaire'), async (req, res) => {
  const { statut } = req.body;
  if (!['valide', 'rejete', 'en_attente'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    await dbRun(
      `UPDATE preachers SET statut = ?, validated_by = ?, validated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [statut, req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: edit preacher
router.put('/:id', requireAuth, requireRole('superadmin', 'secretaire'), upload.single('photo'), async (req, res) => {
  try {
    const existing = await dbGet('SELECT * FROM preachers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Prédicateur introuvable' });

    const data = req.body;
    let photoPath = existing.photo;

    if (req.file) {
      photoPath = await processPhoto(req.file);
      if (existing.photo) {
        const oldPath = path.join(__dirname, '../../uploads', existing.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await dbRun(`
      UPDATE preachers SET
        prenom=?, nom=?, date_naissance=?, lieu_naissance=?, nationalite=?,
        situation_matrimoniale=?, telephone1=?, telephone2=?, email=?, adresse=?,
        pere_nom=?, pere_telephone=?, pere_statut=?,
        mere_nom=?, mere_telephone=?, mere_statut=?,
        conjoint_nom=?, conjoint_telephone=?, nombre_enfants=?,
        fonction=?, pays_affectation=?, eglise_locale=?, date_bapteme=?,
        urgence1_nom=?, urgence1_lien=?, urgence1_telephone=?,
        urgence2_nom=?, urgence2_lien=?, urgence2_telephone=?,
        groupe_sanguin=?, photo=?, updated_at=datetime('now')
      WHERE id=?`,
      [
        data.prenom, data.nom, data.date_naissance || null, data.lieu_naissance || null,
        data.nationalite || null, data.situation_matrimoniale || null,
        data.telephone1 || null, data.telephone2 || null, data.email || null, data.adresse || null,
        data.pere_nom || null, data.pere_telephone || null, data.pere_statut || null,
        data.mere_nom || null, data.mere_telephone || null, data.mere_statut || null,
        data.conjoint_nom || null, data.conjoint_telephone || null, parseInt(data.nombre_enfants) || 0,
        data.fonction || null, data.pays_affectation || null, data.eglise_locale || null, data.date_bapteme || null,
        data.urgence1_nom || null, data.urgence1_lien || null, data.urgence1_telephone || null,
        data.urgence2_nom || null, data.urgence2_lien || null, data.urgence2_telephone || null,
        data.groupe_sanguin || null, photoPath,
        req.params.id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Admin: delete (superadmin only)
router.delete('/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const existing = await dbGet('SELECT photo FROM preachers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (existing.photo) {
      const p = path.join(__dirname, '../../uploads', existing.photo);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await dbRun('DELETE FROM preachers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
