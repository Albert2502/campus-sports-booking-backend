const slotsService = require('../services/slots.service');

async function listSlots(req, res) {
  res.json(await slotsService.listSlots(req.valid.query, req.user));
}

module.exports = {
  listSlots,
};
