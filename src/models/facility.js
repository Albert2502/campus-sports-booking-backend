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
      // These four have defaults in the database; leaving them nullable here
      // lets an INSERT omit them so PostgreSQL applies its defaults.
      pricePerHour: { type: DataTypes.DECIMAL(8, 2) },
      minBookingMinutes: { type: DataTypes.INTEGER },
      // facility_amenity[] in PostgreSQL; the API checks the values.
      amenities: { type: DataTypes.ARRAY(DataTypes.TEXT) },
      status: { type: DataTypes.ENUM('active', 'maintenance', 'inactive') },
      maintenanceNote: { type: DataTypes.STRING(200) },
    },
    { tableName: 'facilities' },
  );
