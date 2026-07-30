const { AUTH_COOKIE_NAME, verifyAuthToken } = require('../security/tokens');

const extractToken = (req) => {
  const authorization = req.get?.('authorization');

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return req.cookies?.[AUTH_COOKIE_NAME];
};

const requireAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  try {
    const claims = verifyAuthToken(token);
    req.user = {
      id: claims.sub,
      email: claims.email,
      role: claims.role
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ msg: 'Invalid or expired authentication' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ msg: 'Access denied' });
  }

  return next();
};

const requireSelfParam = (parameterName) => (req, res, next) => {
  const requestedEmail = req.params[parameterName]?.trim().toLowerCase();

  if (!requestedEmail || requestedEmail !== req.user?.email) {
    return res.status(403).json({ msg: 'Access denied' });
  }

  return next();
};

module.exports = {
  extractToken,
  requireAuth,
  requireRole,
  requireSelfParam
};
