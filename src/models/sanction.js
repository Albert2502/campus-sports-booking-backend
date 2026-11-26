const { DataTypes } = require('sequelize');

/**
 * Maps `sanctions`: a block on one account, lifted by an admin, by a fine or
 * when it expires.
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Sanction',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.STRING(200), allowNull: false },
      startsAt: { type: DataTypes.DATE, allowNull: false },
      endsAt: { type: DataTypes.DATE },
      fineAmount: { type: DataTypes.DECIMAL(8, 2) },
      liftedAt: { type: DataTypes.DATE },
      liftedBy: { type: DataTypes.INTEGER },
      liftMethod: { type: DataTypes.ENUM('expired', 'fine', 'admin') },
    },
    { tableName: 'sanctions' },
  );
