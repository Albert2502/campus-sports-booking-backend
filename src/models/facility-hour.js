const { DataTypes } = require('sequelize');

/**
 * Maps `facility_hours`: one row per weekday (1 = Monday … 7 = Sunday).
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'FacilityHour',
    {
      facilityId: { type: DataTypes.INTEGER, primaryKey: true },
      weekday: { type: DataTypes.SMALLINT, primaryKey: true },
      isClosed: { type: DataTypes.BOOLEAN, allowNull: false },
      opensAt: { type: DataTypes.TIME },
      closesAt: { type: DataTypes.TIME },
    },
    { tableName: 'facility_hours' },
  );
