// Usage: requireRole(['superadmin','manager'])
module.exports = function requireRole(roles) {
  return function(req, res, next) {
    if (req.session && roles.includes(req.session.role)) return next();
    if (!req.session || !req.session.userId) return res.redirect('/login');
    res.status(403).render('403', { role: req.session.role, required: roles });
  };
};
