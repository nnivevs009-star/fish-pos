module.exports = function requireBranch(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  if (req.session.role === 'superadmin') {
    // superadmin can optionally scope to a branch via query param
    req.branchId = req.query.branch_id ? parseInt(req.query.branch_id) : null;
    return next();
  }
  if (!req.session.branchId) {
    return res.status(403).send('No branch assigned. Contact superadmin.');
  }
  req.branchId = req.session.branchId;
  next();
};
