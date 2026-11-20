const express = require('express');
const z = require('zod');

const facilitiesController = require('../controllers/facilities.controller');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const listQuery = z.object({
  sportId: z.coerce
    .number({ error: 'Sportul trebuie să fie un număr.' })
    .int()
    .positive()
    .optional(),
  status: z
    .enum(['active', 'maintenance', 'inactive', 'all'], {
      error: 'Starea poate fi active, maintenance, inactive sau all.',
    })
    .default('active'),
});

const router = express.Router();

// TODO(CB-14): GET /sports, GET /facilities/{facilityId}, POST and PATCH.
router.get(
  '/',
  optionalAuth,
  validate(listQuery, 'query'),
  facilitiesController.listFacilities,
);

module.exports = router;
