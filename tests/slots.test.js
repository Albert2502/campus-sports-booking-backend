const request = require('supertest');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

// A day far from the seed slots, in winter time (+02:00).
const DAY = '2031-03-04';
const at = (time) => `${DAY}T${time}:00+02:00`;

const FOOTBALL = 1;
const TENNIS = 3;
const VOLLEYBALL = 4; // status maintenance in the seed

let teacher;
let student;
let admin;
const slot = {};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function insertSlot(facilityId, start, end) {
  const [[row]] = await sequelize.query(
    `INSERT INTO time_slots (facility_id, starts_at, ends_at)
     VALUES (:facilityId, :start, :end) RETURNING id`,
    { replacements: { facilityId, start: at(start), end: at(end) } },
  );
  return row.id;
}

async function book(slotId, status) {
  await sequelize.query(
    `INSERT INTO bookings (slot_id, captain_id, status)
     VALUES (:slotId, 2, :status)`,
    { replacements: { slotId, status } },
  );
}

beforeAll(async () => {
  resetDatabase();
  [teacher, student, admin] = await Promise.all([
    tokenFor('prof.radu@campus.test'),
    tokenFor('ana@campus.test'),
    tokenFor('admin@campus.test'),
  ]);
  // The football pitch is open 08:00–22:00 every day in the seed.
  slot.beforeOpening = await insertSlot(FOOTBALL, '07:00', '08:00');
  slot.free = await insertSlot(FOOTBALL, '10:00', '11:00');
  slot.booked = await insertSlot(FOOTBALL, '11:00', '12:00');
  slot.cancelled = await insertSlot(FOOTBALL, '12:00', '13:00');
  slot.pastClosing = await insertSlot(FOOTBALL, '21:30', '22:30');
  slot.closure = await insertSlot(TENNIS, '10:00', '11:00');
  slot.pending = await insertSlot(TENNIS, '14:00', '15:00');
  slot.maintenance = await insertSlot(VOLLEYBALL, '10:00', '11:30');
  await book(slot.booked, 'confirmed');
  await book(slot.cancelled, 'cancelled');
  await book(slot.pending, 'pending');
  await sequelize.query(
    `INSERT INTO facility_closures (facility_id, starts_at, ends_at, reason)
     VALUES (:facilityId, :start, :end, 'Reparații')`,
    {
      replacements: {
        facilityId: TENNIS,
        start: at('09:30'),
        end: at('10:30'),
      },
    },
  );
  const [[inactive]] = await sequelize.query(
    `INSERT INTO facilities (sport_id, name, capacity, status)
     VALUES (2, 'Sala inactivă', 10, 'inactive') RETURNING id`,
  );
  slot.inactive = await insertSlot(inactive.id, '10:00', '11:00');
});
afterAll(() => sequelize.close());

const ids = (res) => res.body.map((item) => item.id);

describe('GET /api/v1/slots', () => {
  test('lists a day by facility and hour, with availability and price', async () => {
    const res = await request(app).get('/api/v1/slots').query({ date: DAY });
    expect(res.status).toBe(200);
    // Sala volei, Teren fotbal sintetic, Teren tenis 1.
    expect(ids(res)).toEqual([
      slot.maintenance,
      slot.free,
      slot.booked,
      slot.cancelled,
      slot.closure,
      slot.pending,
    ]);
    expect(res.body.map((item) => item.availability)).toEqual([
      'closed',
      'free',
      'occupied',
      'free',
      'closed',
      'occupied',
    ]);
    expect(res.body[1]).toEqual({
      id: slot.free,
      facilityId: FOOTBALL,
      facilityName: 'Teren fotbal sintetic',
      sportName: 'Fotbal',
      startsAt: '2031-03-04T08:00:00.000Z',
      endsAt: '2031-03-04T09:00:00.000Z',
      availability: 'free',
      price: 60,
      auctionClosesAt: null,
    });
    // 90 minutes of a free hall; one hour of tennis at 40 lei.
    expect(res.body[0].price).toBe(0);
    expect(res.body[5].price).toBe(40);
  });

  test('shows teachers the slots outside the opening hours', async () => {
    const res = await request(app)
      .get('/api/v1/slots')
      .query({ date: DAY, facilityId: FOOTBALL })
      .set(auth(teacher));
    expect(ids(res)).toEqual([
      slot.beforeOpening,
      slot.free,
      slot.booked,
      slot.cancelled,
      slot.pastClosing,
    ]);
  });

  test('shows the slots of inactive facilities to the admin only', async () => {
    const forStudent = await request(app)
      .get('/api/v1/slots')
      .query({ date: DAY })
      .set(auth(student));
    expect(ids(forStudent)).not.toContain(slot.inactive);
    const forAdmin = await request(app)
      .get('/api/v1/slots')
      .query({ date: DAY })
      .set(auth(admin));
    expect(ids(forAdmin)).toEqual(
      expect.arrayContaining([slot.inactive, slot.beforeOpening]),
    );
  });

  test('combines the filters', async () => {
    const get = (query) =>
      request(app)
        .get('/api/v1/slots')
        .query({ date: DAY, ...query });
    expect(ids(await get({ sportId: 3 }))).toEqual([
      slot.closure,
      slot.pending,
    ]);
    expect(ids(await get({ fromTime: '11:00', toTime: '13:00' }))).toEqual([
      slot.booked,
      slot.cancelled,
    ]);
    expect(ids(await get({ available: 'true' }))).toEqual([
      slot.free,
      slot.cancelled,
    ]);
    expect(
      ids(await get({ facilityId: FOOTBALL, available: 'false' })),
    ).toEqual([slot.free, slot.booked, slot.cancelled]);
  });

  test('takes an interval instead of a day', async () => {
    const res = await request(app)
      .get('/api/v1/slots')
      .query({ from: at('11:00'), to: at('13:00') });
    expect(ids(res)).toEqual([slot.booked, slot.cancelled]);
  });

  test("returns today's slots when no day or interval is given", async () => {
    const [[today]] = await sequelize.query(
      `INSERT INTO time_slots (facility_id, starts_at, ends_at)
       SELECT 2, d + TIME '23:00', d + TIME '23:30'
       FROM (SELECT (now() AT TIME ZONE 'Europe/Bucharest')::date AS d) t
       RETURNING id`,
    );
    const res = await request(app).get('/api/v1/slots').set(auth(admin));
    expect(res.status).toBe(200);
    expect(ids(res)).toContain(today.id);
    expect(ids(res)).not.toContain(slot.free);
  });

  test('answers 400 for filters that do not fit together', async () => {
    const fieldOf = async (query) => {
      const res = await request(app).get('/api/v1/slots').query(query);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      return Object.keys(res.body.details.fields);
    };
    expect(await fieldOf({ date: DAY, from: at('10:00') })).toEqual(['date']);
    expect(await fieldOf({ from: at('10:00') })).toEqual(['to']);
    expect(await fieldOf({ from: at('10:00'), to: at('09:00') })).toEqual([
      'to',
    ]);
    expect(
      await fieldOf({ from: at('10:00'), to: '2031-04-10T10:00:00+03:00' }),
    ).toEqual(['to']);
    expect(await fieldOf({ date: '2031-3-4' })).toEqual(['date']);
    expect(await fieldOf({ fromTime: '25:00' })).toEqual(['fromTime']);
    expect(await fieldOf({ fromTime: '12:00', toTime: '11:00' })).toEqual([
      'toTime',
    ]);
    expect(await fieldOf({ available: 'yes' })).toEqual(['available']);
    expect(await fieldOf({ sportId: 'abc' })).toEqual(['sportId']);
  });
});

describe('GET /api/v1/slots/{slotId}', () => {
  test('returns one slot with its availability', async () => {
    const res = await request(app).get(`/api/v1/slots/${slot.booked}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: slot.booked,
      availability: 'occupied',
      price: 60,
    });
  });

  test('hides what the caller may not see, as 404', async () => {
    const get = (id, token) => {
      const req = request(app).get(`/api/v1/slots/${id}`);
      return token ? req.set(auth(token)) : req;
    };
    expect((await get(slot.beforeOpening)).status).toBe(404);
    expect((await get(slot.beforeOpening, teacher)).status).toBe(200);
    expect((await get(slot.inactive, student)).status).toBe(404);
    expect((await get(slot.inactive, admin)).status).toBe(200);
  });

  test('answers 404 for an unknown id and 400 for a malformed one', async () => {
    const missing = await request(app).get('/api/v1/slots/999999');
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
    const malformed = await request(app).get('/api/v1/slots/abc');
    expect(malformed.status).toBe(400);
    expect(malformed.body.details.fields).toHaveProperty('slotId');
  });
});
