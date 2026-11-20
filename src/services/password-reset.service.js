const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../errors/app-error');
const usersRepository = require('../repositories/users.repository');
const mailService = require('./mail.service');
const { hashPassword } = require('./users.service');

const PURPOSE = 'password-reset';
// users.id is a PostgreSQL integer; a bigger id would make the lookup fail.
const MAX_USER_ID = 2147483647;

// Signing with the current hash binds the token to the current password: once
// the password changes (reset or change), old links stop verifying, so no
// table is needed for "used" tokens (openapi.yaml, /auth/password-reset).
function secretFor(user) {
  return env.jwtSecret + user.passwordHash;
}

function invalidToken() {
  return new AppError(
    410,
    'RESET_TOKEN_INVALID',
    'Linkul de resetare a expirat sau a fost deja folosit. Cere unul nou.',
  );
}

function resetEmail(user, link) {
  return {
    to: user.email,
    subject: 'Resetarea parolei – Campus Sports Booking',
    text: [
      `Bună, ${user.fullName},`,
      '',
      'Am primit o cerere de resetare a parolei pentru contul tău. ' +
        'Deschide linkul de mai jos ca să alegi o parolă nouă. Linkul e ' +
        'valabil o oră și se poate folosi o singură dată.',
      '',
      link,
      '',
      'Dacă nu ai cerut tu resetarea, ignoră acest email: parola rămâne aceeași.',
    ].join('\n'),
  };
}

/**
 * Sends a reset link if the email has an account. The caller answers 202
 * either way, so the response does not reveal which emails exist.
 * @param {string} email
 * @return {Promise<void>}
 */
async function requestReset(email) {
  const user = await usersRepository.findByEmail(email);
  if (!user) {
    return;
  }
  const token = jwt.sign({ purpose: PURPOSE }, secretFor(user), {
    subject: String(user.id),
    expiresIn: env.passwordResetExpiresInSeconds,
  });
  const link = `${env.appUrl}/resetare-parola?token=${encodeURIComponent(token)}`;
  // Not awaited: waiting for the SMTP server would make known emails answer
  // slower than unknown ones. A failure is logged; the user can ask again.
  // Only the code is logged: SMTP errors can contain the recipient address.
  mailService.sendMail(resetEmail(user, link)).catch((error) => {
    console.error(
      `Password reset email to user ${user.id} failed (${error.code ?? 'no code'}).`,
    );
  });
}

/**
 * Sets the new password if the token is valid for the user's current password.
 * @param {string} token from the emailed link
 * @param {string} newPassword
 * @return {Promise<void>}
 */
async function confirmReset(token, newPassword) {
  // The user (and so the secret) is only known after reading the subject.
  const unverified = jwt.decode(token);
  const userId = /^\d+$/.test(String(unverified?.sub))
    ? Number(unverified.sub)
    : NaN;
  if (!(userId >= 1 && userId <= MAX_USER_ID)) {
    throw invalidToken();
  }
  const user = await usersRepository.findById(userId);
  if (!user) {
    throw invalidToken();
  }
  let payload;
  try {
    payload = jwt.verify(token, secretFor(user), { algorithms: ['HS256'] });
  } catch {
    throw invalidToken();
  }
  if (payload.purpose !== PURPOSE) {
    throw invalidToken();
  }
  // Only if the hash is still the one the token was checked against: of two
  // simultaneous confirms with the same link, the second one fails.
  const updated = await usersRepository.replacePasswordHash(
    user.id,
    user.passwordHash,
    await hashPassword(newPassword),
  );
  if (!updated) {
    throw invalidToken();
  }
}

module.exports = {
  requestReset,
  confirmReset,
};
