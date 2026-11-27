const imagesService = require('../services/facility-images.service');
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

async function addImage(req, res) {
  res
    .status(201)
    .json(await imagesService.addImage(req.valid.params.facilityId, req.file));
}

async function deleteImage(req, res) {
  const { facilityId, imageId } = req.valid.params;
  await imagesService.deleteImage(facilityId, imageId);
  res.status(204).end();
}

module.exports = {
  addImage,
  deleteImage,
  listSports,
  listFacilities,
  getFacility,
  createFacility,
  updateFacility,
};
