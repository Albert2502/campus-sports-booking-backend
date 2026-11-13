const bookingsService = require('../services/bookings.service');

async function createBooking(req, res) {
  const booking = await bookingsService.createBooking(
    req.valid.body.slotId,
    req.user,
  );
  res.status(201).json(booking);
}

async function listBookings(req, res) {
  res.json(await bookingsService.listBookings(req.user, req.valid.query));
}

async function getBooking(req, res) {
  const { bookingId } = req.valid.params;
  res.json(await bookingsService.getBooking(bookingId, req.user));
}

module.exports = {
  createBooking,
  listBookings,
  getBooking,
};
