// Role-based access control
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit pour votre rôle' });
    }
    next();
  };
}

// Shortcuts
const isAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
const isTransporteur = requireRole('TRANSPORTEUR');
const isChargeur = requireRole('CHARGEUR');
const isAdminOrChargeur = requireRole('ADMIN', 'SUPER_ADMIN', 'CHARGEUR');
const isAdminOrTransporteur = requireRole('ADMIN', 'SUPER_ADMIN', 'TRANSPORTEUR');
const isVerified = (req, res, next) => {
  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Compte non vérifié. Complétez votre profil.' });
  }
  next();
};

module.exports = { requireRole, isAdmin, isTransporteur, isChargeur, isAdminOrChargeur, isAdminOrTransporteur, isVerified };
