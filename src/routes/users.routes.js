const express = require('express');
const z = require('zod');

const usersController = require('../controllers/users.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { newPassword } = require('../validation/password');
const { listUsersQuery } = require('../validation/user');

const changePasswordBody = z
  .object({
    currentPassword: z
      .string({ error: 'Introdu parola curentă.' })
      .min(1, { error: 'Introdu parola curentă.' }),
    newPassword,
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    error: 'Parola nouă trebuie să fie diferită de cea curentă.',
    path: ['newPassword'],
  });

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listUsersQuery, 'query'),
  usersController.listUsers,
);
router.get('/me', requireAuth, usersController.getMe);
router.post(
  '/me/password',
  requireAuth,
  validate(changePasswordBody),
  usersController.changePassword,
);

module.exports = router;
