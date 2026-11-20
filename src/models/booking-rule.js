const { DataTypes } = require('sequelize');

/**
 * Maps `booking_rules`, the single row of business limits (id = 1).
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'BookingRule',
    {
      id: { type: DataTypes.SMALLINT, primaryKey: true },
      monthlyBookingLimit: { type: DataTypes.INTEGER, allowNull: false },
      limitAppliesToTeachers: { type: DataTypes.BOOLEAN, allowNull: false },
      freeCancelHours: { type: DataTypes.INTEGER, allowNull: false },
      checkinMinutesBefore: { type: DataTypes.INTEGER, allowNull: false },
      sanctionAfterIncidents: { type: DataTypes.INTEGER, allowNull: false },
      banMonths: { type: DataTypes.INTEGER, allowNull: false },
      unbanFineAmount: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    },
    { tableName: 'booking_rules' },
  );
