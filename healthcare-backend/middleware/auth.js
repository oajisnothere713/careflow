/**
 * MVP Context Middleware (JWT-Free)
 * Reads role, clinic, and user context directly from HTTP headers sent by the frontend,
 * defaulting to Super Admin so features are easily accessible in demo mode.
 */

const parseUserContext = (req) => {
  const role = req.header('x-role') || 'super_admin';
  const clinicId = req.header('x-clinic-id') || null;
  const doctorId = req.header('x-doctor-id') || null;
  const userId = req.header('x-user-id') || 'demo-super-admin';
  const email = req.header('x-user-email') || 'demo@healthcare.local';

  return {
    userId,
    role,
    email,
    clinicId,
    doctorId,
  };
};

/**
 * Attaches user context to request
 */
const verifyToken = (req, res, next) => {
  req.user = parseUserContext(req);
  next();
};

/**
 * Optional auth pass-through
 */
const optionalAuth = (req, res, next) => {
  req.user = parseUserContext(req);
  next();
};

/**
 * Check if user has required role(s)
 * @param {string|string[]} roles - Single role or array of allowed roles
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      req.user = parseUserContext(req);
    }

    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied. Insufficient permissions.',
      requiredRole: roles,
      userRole: req.user.role,
    });
  };
};

/**
 * Check if user belongs to the same clinic (for clinic-scoped operations)
 */
const checkClinicAccess = (req, res, next) => {
  if (!req.user) {
    req.user = parseUserContext(req);
  }

  // Super Admin can access all clinics
  if (req.user.role === 'super_admin' || req.user.role === 'admin') {
    return next();
  }

  const clinicIdFromParams = req.params.clinicId || req.body.clinic_id || req.query.clinic_id;

  // Check if user's clinic matches the requested clinic
  if (req.user.clinicId && clinicIdFromParams && req.user.clinicId.toString() !== clinicIdFromParams.toString()) {
    return res.status(403).json({
      message: 'Access denied. You can only access data from your clinic.',
    });
  }

  next();
};

/**
 * Check if user is super admin
 */
const checkSuperAdmin = (req, res, next) => {
  if (!req.user) {
    req.user = parseUserContext(req);
  }

  if (req.user.role === 'super_admin') {
    return next();
  }

  return res.status(403).json({
    message: 'Access denied. Super Admin privileges required.',
    userRole: req.user.role,
  });
};

/**
 * Check if user is clinic admin or super admin
 */
const checkClinicAdminOrSuper = (req, res, next) => {
  if (!req.user) {
    req.user = parseUserContext(req);
  }

  if (['super_admin', 'clinic_admin'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    message: 'Access denied. Admin privileges required.',
    userRole: req.user.role,
  });
};

module.exports = {
  verifyToken,
  checkRole,
  checkClinicAccess,
  optionalAuth,
  checkSuperAdmin,
  checkClinicAdminOrSuper,
};
