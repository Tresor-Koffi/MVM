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
    const d = req.body;
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,
        $24,$25,$26,$27,$28,$29,
        $30,$31,'en_attente'
      ) RETURNING id`,
      [
        d.prenom, d.nom, d.date_naissance || null, d.lieu_naissance || null,
        d.nationalite || null, d.situation_matrimoniale || null,
        d.telephone1 || null, d.telephone2 || null, d.email || null, d.adresse || null,
        d.pere_nom || null, d.pere_telephone || null, d.pere_statut || null,
        d.mere_nom || null, d.mere_telephone || null, d.mere_statut || null,
        d.conjoint_nom || null, d.conjoint_telephone || null, parseInt(d.nombre_enfants) || 0,
        d.fonction || null, d.pays_affectation || null, d.eglise_locale || null, d.date_bapteme || null,
        d.urgence1_nom || null, d.urgence1_lien || null, d.urgence1_telephone || null,
        d.urgence2_nom || null, d.urgence2_lien || null, d.urgence2_telephone || null,
        d.groupe_sanguin || null, photoPath,
      ]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
  }
});

// Admin: stats (before /:id)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totalRow, enAttenteRow, valideRow, zones] = await Promise.all([
      dbGet('SELECT COUNT(*)::int AS cnt FROM preachers', []),
      dbGet("SELECT COUNT(*)::int AS cnt FROM preachers WHERE statut = 'en_attente'", []),
      dbGet("SELECT COUNT(*)::int AS cnt FROM preachers WHERE statut = 'valide'", []),
      dbAll(
        `SELECT pays_affectation, COUNT(*)::int AS cnt
         FROM preachers
         WHERE pays_affectation IS NOT NULL AND pays_affectation <> ''
         GROUP BY pays_affectation ORDER BY cnt DESC`,
        []
      ),
    ]);
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

    const fmt = (v) => {
      if (v == null) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
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
      ].map(fmt).join(','));
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
    let p = 1; // PostgreSQL parameter index

    if (search) {
      where.push(`(prenom ILIKE $${p} OR nom ILIKE $${p+1} OR email ILIKE $${p+2} OR telephone1 ILIKE $${p+3})`);
      const s = `%${search}%`;
      params.push(s, s, s, s);
      p += 4;
    }
    if (statut) { where.push(`statut = $${p}`);              params.push(statut); p++; }
    if (zone)   { where.push(`pays_affectation = $${p}`);    params.push(zone);   p++; }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRow, rows] = await Promise.all([
      dbGet(`SELECT COUNT(*)::int AS cnt FROM preachers ${whereClause}`, params),
      dbAll(
        `SELECT id, prenom, nom, email, telephone1, fonction, pays_affectation,
                eglise_locale, statut, photo, created_at
         FROM preachers ${whereClause}
         ORDER BY created_at DESC LIMIT $${p} OFFSET $${p+1}`,
        [...params, parseInt(limit), offset]
      ),
    ]);

    res.json({ data: rows, total: countRow.cnt, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: get one preacher
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM preachers WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Prédicateur introuvable' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin: validate / reject
router.patch('/:id/statut', requireAuth, requireRole('superadmin', 'secretaire'), async (req, res) => {
  const { statut } = req.body;
  if (!['valide', 'rejete', 'en_attente'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    await dbRun(
      `UPDATE preachers
       SET statut=$1, validated_by=$2, validated_at=NOW(), updated_at=NOW()
       WHERE id=$3`,
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
    const existing = await dbGet('SELECT * FROM preachers WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Prédicateur introuvable' });

    const d = req.body;
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
        prenom=$1, nom=$2, date_naissance=$3, lieu_naissance=$4, nationalite=$5,
        situation_matrimoniale=$6, telephone1=$7, telephone2=$8, email=$9, adresse=$10,
        pere_nom=$11, pere_telephone=$12, pere_statut=$13,
        mere_nom=$14, mere_telephone=$15, mere_statut=$16,
        conjoint_nom=$17, conjoint_telephone=$18, nombre_enfants=$19,
        fonction=$20, pays_affectation=$21, eglise_locale=$22, date_bapteme=$23,
        urgence1_nom=$24, urgence1_lien=$25, urgence1_telephone=$26,
        urgence2_nom=$27, urgence2_lien=$28, urgence2_telephone=$29,
        groupe_sanguin=$30, photo=$31, updated_at=NOW()
      WHERE id=$32`,
      [
        d.prenom, d.nom, d.date_naissance || null, d.lieu_naissance || null,
        d.nationalite || null, d.situation_matrimoniale || null,
        d.telephone1 || null, d.telephone2 || null, d.email || null, d.adresse || null,
        d.pere_nom || null, d.pere_telephone || null, d.pere_statut || null,
        d.mere_nom || null, d.mere_telephone || null, d.mere_statut || null,
        d.conjoint_nom || null, d.conjoint_telephone || null, parseInt(d.nombre_enfants) || 0,
        d.fonction || null, d.pays_affectation || null, d.eglise_locale || null, d.date_bapteme || null,
        d.urgence1_nom || null, d.urgence1_lien || null, d.urgence1_telephone || null,
        d.urgence2_nom || null, d.urgence2_lien || null, d.urgence2_telephone || null,
        d.groupe_sanguin || null, photoPath,
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
    const existing = await dbGet('SELECT photo FROM preachers WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Introuvable' });

    if (existing.photo) {
      const p = path.join(__dirname, '../../uploads', existing.photo);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await dbRun('DELETE FROM preachers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
