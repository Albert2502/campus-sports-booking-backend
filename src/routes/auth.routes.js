const express = require('express');
const z = require('zod');

const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { newPassword } = require('../validation/password');

const loginBody = z.object({
  email: z
    .email({ error: 'Introdu o adresă de email validă.' })
    .refine(
      (email) => email.toLowerCase().endsWith(`@${env.allowedEmailDomain}`),
      {
        error: `Folosește adresa instituțională (@${env.allowedEmailDomain}).`,
      },
    ),
  password: z
    .string({ error: 'Introdu parola.' })
    .min(8, { error: 'Parola are cel puțin 8 caractere.' }),
});

// Any well-formed address: one from another domain simply has no account.
const resetRequestBody = z.object({
  email: z.email({ error: 'Introdu o adresă de email validă.' }),
});

const resetConfirmBody = z.object({
  token: z
    .string({ error: 'Lipsește codul din link.' })
    .min(1, { error: 'Lipsește codul din link.' }),
  newPassword,
});

const router = express.Router();

router.post('/login', validate(loginBody), authController.login);
router.post(
  '/password-reset',
  validate(resetRequestBody),
  authController.requestPasswordReset,
);
router.post(
  '/password-reset/confirm',
  validate(resetConfirmBody),
  authController.confirmPasswordReset,
);

module.exports = router;
