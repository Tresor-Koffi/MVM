const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mvm_secret_2024';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const raw = (header && header.startsWith('Bearer ')) ? header.slice(7) : req.query.token;
  if (!raw) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    req.user = jwt.verify(raw, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
