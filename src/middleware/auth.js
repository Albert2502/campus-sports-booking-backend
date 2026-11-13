const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../errors/app-error');

/**
 * Returns the user from a valid `Authorization: Bearer` header, or null when
 * the header is missing.
 * @param {import('express').Request} req
 * @return {?{id: number, role: string}}
 */
function readUser(req) {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Autentifică-te din nou.');
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return { id: Number(payload.sub), role: payload.role };
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Sesiunea a expirat.');
  }
}

function requireAuth(req, res, next) {
  const user = readUser(req);
  if (!user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Autentifică-te pentru a continua.',
    );
  }
  req.user = user;
  next();
}

/** Public routes that answer differently for signed-in users and admins. */
function optionalAuth(req, res, next) {
  req.user = readUser(req);
  next();
}

/**
 * @param {...string} roles
 * @return {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Nu ai acces la această pagină.');
    }
    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
};
