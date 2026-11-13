const express = require('express');
const z = require('zod');

const authController = require('../controllers/auth.controller');
const bookingsController = require('../controllers/bookings.controller');
const facilitiesController = require('../controllers/facilities.controller');
const slotsController = require('../controllers/slots.controller');
const usersController = require('../controllers/users.controller');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const id = z.coerce.number().int().positive();

const loginBody = z.object({
  email: z.email({ error: 'Introdu un email valid.' }),
  password: z.string().min(1, { error: 'Introdu parola.' }),
});

const facilitiesQuery = z.object({
  status: z
    .enum(['active', 'maintenance', 'inactive', 'all'])
    .default('active'),
});

const slotsQuery = z.object({
  facilityId: id.optional(),
  date: z.iso
    .date({ error: 'Data trebuie să fie de forma AAAA-LL-ZZ.' })
    .optional(),
});

// The demo books a slot only; teams and open matches come with their tasks.
const bookingBody = z.strictObject({ slotId: z.number().int().positive() });

const bookingsQuery = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/auth/login', validate(loginBody), authController.login);

router.get('/users/me', requireAuth, usersController.getMe);

router.get(
  '/facilities',
  optionalAuth,
  validate(facilitiesQuery, 'query'),
  facilitiesController.listFacilities,
);
router.get(
  '/facilities/:facilityId',
  optionalAuth,
  validate(z.object({ facilityId: id }), 'params'),
  facilitiesController.getFacility,
);

router.get(
  '/slots',
  optionalAuth,
  validate(slotsQuery, 'query'),
  slotsController.listSlots,
);

router.get(
  '/bookings',
  requireAuth,
  validate(bookingsQuery, 'query'),
  bookingsController.listBookings,
);
router.post(
  '/bookings',
  requireAuth,
  validate(bookingBody),
  bookingsController.createBooking,
);
router.get(
  '/bookings/:bookingId',
  requireAuth,
  validate(z.object({ bookingId: id }), 'params'),
  bookingsController.getBooking,
);

module.exports = router;
