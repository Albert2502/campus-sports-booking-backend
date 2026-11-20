const { DataTypes } = require('sequelize');

/**
 * Maps `facility_images`; `path` is relative to the uploads/ folder.
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'FacilityImage',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      facilityId: { type: DataTypes.INTEGER, allowNull: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'facility_images' },
  );
