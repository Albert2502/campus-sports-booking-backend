const facilitiesService = require('../services/facilities.service');

async function listFacilities(req, res) {
  const { status } = req.valid.query;
  res.json(await facilitiesService.listFacilities(status, req.user));
}

async function getFacility(req, res) {
  const { facilityId } = req.valid.params;
  res.json(await facilitiesService.getFacility(facilityId, req.user));
}

module.exports = {
  listFacilities,
  getFacility,
};
