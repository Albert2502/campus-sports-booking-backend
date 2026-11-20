const { DataTypes } = require('sequelize');

/**
 * Maps the `facilities` table.
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Facility',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sportId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(200) },
      description: { type: DataTypes.STRING(1000) },
      capacity: { type: DataTypes.INTEGER, allowNull: false },
      pricePerHour: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
      opensAt: { type: DataTypes.TIME },
      closesAt: { type: DataTypes.TIME },
      status: {
        type: DataTypes.ENUM('active', 'maintenance', 'inactive'),
        allowNull: false,
      },
    },
    { tableName: 'facilities' },
  );
