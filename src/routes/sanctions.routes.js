const express = require('express');

const sanctionsController = require('../controllers/sanctions.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { liftSanctionBody, sanctionParams } = require('../validation/sanction');

const router = express.Router();

router.patch(
  '/:sanctionId',
  requireAuth,
  requireRole('admin'),
  validate(sanctionParams, 'params'),
  validate(liftSanctionBody),
  sanctionsController.liftSanction,
);

module.exports = router;
