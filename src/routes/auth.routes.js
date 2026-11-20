const express = require('express');
const z = require('zod');

const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');

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

const router = express.Router();

router.post('/login', validate(loginBody), authController.login);

module.exports = router;
