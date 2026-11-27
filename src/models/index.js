const sequelize = require('../config/database');
const defineBookingRule = require('./booking-rule');
const defineFacility = require('./facility');
const defineFacilityHour = require('./facility-hour');
const defineFacilityImage = require('./facility-image');
const defineSport = require('./sport');
const defineUser = require('./user');

const BookingRule = defineBookingRule(sequelize);
const Facility = defineFacility(sequelize);
const FacilityHour = defineFacilityHour(sequelize);
const FacilityImage = defineFacilityImage(sequelize);
const Sport = defineSport(sequelize);
const User = defineUser(sequelize);

Facility.belongsTo(Sport, { as: 'sport', foreignKey: 'sportId' });
Facility.hasMany(FacilityImage, { as: 'images', foreignKey: 'facilityId' });
Facility.hasMany(FacilityHour, { as: 'hours', foreignKey: 'facilityId' });

module.exports = {
  sequelize,
  BookingRule,
  Facility,
  FacilityHour,
  FacilityImage,
  Sport,
  User,
};
