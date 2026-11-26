const slotsService = require('../services/slots.service');

async function listSlots(req, res) {
  res.json(await slotsService.listSlots(req.valid.query, req.user));
}

async function getSlot(req, res) {
  res.json(await slotsService.getSlot(req.valid.params.slotId, req.user));
}

module.exports = {
  listSlots,
  getSlot,
};
