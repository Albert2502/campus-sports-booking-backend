const { DataTypes } = require('sequelize');

/**
 * Maps the `users` table.
 * @param {import('sequelize').Sequelize} sequelize
 * @return {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) =>
  sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING(255), allowNull: false },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      fullName: { type: DataTypes.STRING(120), allowNull: false },
      role: {
        type: DataTypes.ENUM('student', 'teacher', 'admin'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'blocked'),
        allowNull: false,
      },
      blockedUntil: { type: DataTypes.DATE },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'users' },
  );
