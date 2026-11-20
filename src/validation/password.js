const z = require('zod');

// bcrypt ignores everything after 72 bytes, so longer passwords are refused
// instead of being silently cut.
const MAX_PASSWORD_BYTES = 72;

/** Rules for a password the user chooses (change and reset). */
const newPassword = z
  .string({ error: 'Introdu parola nouă.' })
  .min(8, { error: 'Parola nouă are cel puțin 8 caractere.' })
  .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES, {
    error: 'Parola nouă e prea lungă (cel mult 72 de caractere).',
  });

module.exports = {
  newPassword,
};
