const sequelize = require('../config/database');
const defineBookingRule = require('./booking-rule');
const defineFacility = require('./facility');
const defineFacilityImage = require('./facility-image');
const defineSanction = require('./sanction');
const defineSport = require('./sport');
const defineUser = require('./user');

const BookingRule = defineBookingRule(sequelize);
const Facility = defineFacility(sequelize);
const FacilityImage = defineFacilityImage(sequelize);
const Sanction = defineSanction(sequelize);
const Sport = defineSport(sequelize);
const User = defineUser(sequelize);

Facility.belongsTo(Sport, { as: 'sport', foreignKey: 'sportId' });
Facility.hasMany(FacilityImage, { as: 'images', foreignKey: 'facilityId' });

module.exports = {
  sequelize,
  BookingRule,
  Facility,
  FacilityImage,
  Sanction,
  Sport,
  User,
};
