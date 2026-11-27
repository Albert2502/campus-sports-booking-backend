const { sequelize, Facility, FacilityImage } = require('../models');

/**
 * Adds an image if the facility has fewer than `max`. The facility row is
 * locked, so two uploads at the same time cannot both pass the count.
 * `store` writes the file and runs inside the transaction: if it throws,
 * nothing is inserted.
 * @param {number} facilityId
 * @param {number} max
 * @param {function(): Promise<string>} store returns the stored path
 * @return {Promise<?import('sequelize').Model>} null when the limit is reached
 */
function addWithinLimit(facilityId, max, store) {
  return sequelize.transaction(async (transaction) => {
    await Facility.findByPk(facilityId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    const images = await FacilityImage.findAll({
      where: { facilityId },
      attributes: ['position'],
      transaction,
    });
    if (images.length >= max) {
      return null;
    }
    const nextPosition =
      images.reduce((top, image) => Math.max(top, image.position), -1) + 1;
    const path = await store();
    return FacilityImage.create(
      { facilityId, path, position: nextPosition, createdAt: new Date() },
      { transaction },
    );
  });
}

/**
 * @param {number} facilityId
 * @param {number} imageId
 * @return {Promise<?import('sequelize').Model>}
 */
function findOne(facilityId, imageId) {
  return FacilityImage.findOne({ where: { id: imageId, facilityId } });
}

/**
 * @param {number} imageId
 * @return {Promise<void>}
 */
async function remove(imageId) {
  await FacilityImage.destroy({ where: { id: imageId } });
}

module.exports = {
  addWithinLimit,
  findOne,
  remove,
};
