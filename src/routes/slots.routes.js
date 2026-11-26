const express = require('express');

const slotsController = require('../controllers/slots.controller');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { listSlotsQuery, slotParams } = require('../validation/slot');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  validate(listSlotsQuery, 'query'),
  slotsController.listSlots,
);
router.get(
  '/:slotId',
  optionalAuth,
  validate(slotParams, 'params'),
  slotsController.getSlot,
);

module.exports = router;
