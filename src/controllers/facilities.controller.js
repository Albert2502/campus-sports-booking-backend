const facilitiesService = require('../services/facilities.service');

async function listFacilities(req, res) {
  res.json(await facilitiesService.listFacilities(req.valid.query, req.user));
}

module.exports = {
  listFacilities,
};
