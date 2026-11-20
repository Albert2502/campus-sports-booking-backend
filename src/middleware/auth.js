const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../errors/app-error');

/**
 * The user from a valid `Authorization: Bearer` header, or null when there is
 * no header at all.
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

/** For public routes that answer differently to signed-in users. */
function optionalAuth(req, res, next) {
  req.user = readUser(req);
  next();
}

/**
 * Lets through only the given roles; use after `requireAuth`.
 * @param {...string} roles
 * @return {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Nu ai acces la această acțiune.');
    }
    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
};
