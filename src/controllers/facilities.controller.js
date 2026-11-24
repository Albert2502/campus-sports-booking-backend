const facilitiesService = require('../services/facilities.service');

async function listSports(req, res) {
  res.json(await facilitiesService.listSports());
}

async function listFacilities(req, res) {
  res.json(await facilitiesService.listFacilities(req.valid.query, req.user));
}

async function getFacility(req, res) {
  res.json(
    await facilitiesService.getFacility(req.valid.params.facilityId, req.user),
  );
}

async function createFacility(req, res) {
  res.status(201).json(await facilitiesService.createFacility(req.valid.body));
}

async function updateFacility(req, res) {
  res.json(
    await facilitiesService.updateFacility(
      req.valid.params.facilityId,
      req.valid.body,
    ),
  );
}

module.exports = {
  listSports,
  listFacilities,
  getFacility,
  createFacility,
  updateFacility,
};
