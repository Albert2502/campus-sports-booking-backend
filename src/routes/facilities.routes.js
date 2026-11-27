const express = require('express');
const z = require('zod');

const facilitiesController = require('../controllers/facilities.controller');
const {
  optionalAuth,
  requireAuth,
  requireRole,
} = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  createFacilityBody,
  updateFacilityBody,
} = require('../validation/facility');

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

const idParams = z.object({
  facilityId: z.coerce
    .number({ error: 'Id-ul facilității este un număr.' })
    .int({ error: 'Id-ul facilității este un număr.' })
    .positive({ error: 'Id-ul facilității este un număr.' })
    // facilities.id is a PostgreSQL integer.
    .max(2147483647, { error: 'Id-ul facilității este prea mare.' }),
});

const imageParams = idParams.extend({
  imageId: z.coerce
    .number({ error: 'Id-ul imaginii este un număr.' })
    .int({ error: 'Id-ul imaginii este un număr.' })
    .positive({ error: 'Id-ul imaginii este un număr.' })
    .max(2147483647, { error: 'Id-ul imaginii este prea mare.' }),
});

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  validate(listQuery, 'query'),
  facilitiesController.listFacilities,
);
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(createFacilityBody),
  facilitiesController.createFacility,
);
router.get(
  '/:facilityId',
  optionalAuth,
  validate(idParams, 'params'),
  facilitiesController.getFacility,
);
router.patch(
  '/:facilityId',
  requireAuth,
  requireRole('admin'),
  validate(idParams, 'params'),
  validate(updateFacilityBody),
  facilitiesController.updateFacility,
);

router.post(
  '/:facilityId/images',
  requireAuth,
  requireRole('admin'),
  validate(idParams, 'params'),
  uploadImage,
  facilitiesController.addImage,
);
router.delete(
  '/:facilityId/images/:imageId',
  requireAuth,
  requireRole('admin'),
  validate(imageParams, 'params'),
  facilitiesController.deleteImage,
);

module.exports = router;
