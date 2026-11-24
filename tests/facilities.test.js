const request = require('supertest');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

const WEEK_OPEN = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  closed: false,
  opensAt: '09:00',
  closesAt: '21:00',
}));
const WEEK = [...WEEK_OPEN, { weekday: 7, closed: true }];

let admin;
let student;

beforeAll(async () => {
  resetDatabase();
  admin = await tokenFor('admin@campus.test');
  student = await tokenFor('ana@campus.test');
});
afterAll(() => sequelize.close());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/v1/sports', () => {
  test('lists the sports by name, without a token', async () => {
    const res = await request(app).get('/api/v1/sports');
    expect(res.status).toBe(200);
    expect(res.body.map((sport) => sport.name)).toEqual([
      'Baschet',
      'Fotbal',
      'Tenis',
      'Volei',
    ]);
  });
});

describe('GET /api/v1/facilities', () => {
  test('lists only active facilities by default, with the new details', async () => {
    const res = await request(app).get('/api/v1/facilities');
    expect(res.status).toBe(200);
    expect(res.body.map((f) => f.status)).toEqual([
      'active',
      'active',
      'active',
    ]);
    const football = res.body.find((f) => f.name === 'Teren fotbal sintetic');
    expect(football).toMatchObject({
      pricePerHour: 60,
      minBookingMinutes: 60,
      amenities: ['vestiare', 'nocturna', 'dus'],
      maintenanceNote: null,
    });
    expect(football.hours).toHaveLength(7);
    expect(football.hours[0]).toEqual({
      weekday: 1,
      closed: false,
      opensAt: '08:00',
      closesAt: '22:00',
    });
    expect(football).not.toHaveProperty('opensAt');
  });

  test('lets only the admin list every status', async () => {
    const forbidden = await request(app)
      .get('/api/v1/facilities?status=all')
      .set(auth(student));
    expect(forbidden.status).toBe(403);
    const res = await request(app)
      .get('/api/v1/facilities?status=all')
      .set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  test('filters by sport', async () => {
    const res = await request(app).get('/api/v1/facilities?sportId=3');
    expect(res.body.map((f) => f.name)).toEqual(['Teren tenis 1']);
  });
});

describe('GET /api/v1/facilities/{facilityId}', () => {
  test('returns a facility to anyone', async () => {
    const res = await request(app).get('/api/v1/facilities/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Teren fotbal sintetic');
  });

  test('shows a facility in maintenance with its note', async () => {
    const res = await request(app).get('/api/v1/facilities/4');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('maintenance');
    expect(res.body.maintenanceNote).toMatch(/parchetului/);
    expect(res.body.minBookingMinutes).toBe(90);
  });

  test('answers 404 for an unknown id and 400 for a malformed one', async () => {
    expect((await request(app).get('/api/v1/facilities/9999')).status).toBe(
      404,
    );
    const bad = await request(app).get('/api/v1/facilities/abc');
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields.facilityId).toBeDefined();
    expect(
      (await request(app).get('/api/v1/facilities/99999999999')).status,
    ).toBe(400);
  });
});

describe('POST /api/v1/facilities', () => {
  const minimal = { sportId: 2, name: 'Sala mica', capacity: 6 };

  test('needs a token (401) and the admin role (403)', async () => {
    expect(
      (await request(app).post('/api/v1/facilities').send(minimal)).status,
    ).toBe(401);
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(student))
      .send(minimal);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('answers 400 for an empty body, naming the required fields', async () => {
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(admin))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toMatchObject({
      sportId: 'Alege sportul.',
      name: 'Introdu denumirea.',
      capacity: 'Introdu capacitatea.',
    });
  });

  test('answers 400 for a sport that does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(admin))
      .send({ ...minimal, sportId: 999 });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.sportId).toBe('Sportul ales nu există.');
  });

  test.each([
    ['an incomplete week', { hours: WEEK_OPEN }, 'hours'],
    [
      'closing before opening',
      {
        hours: WEEK.map((day) =>
          day.weekday === 1 ? { ...day, closesAt: '08:00' } : day,
        ),
      },
      'hours.0.closesAt',
    ],
    [
      'a repeated weekday',
      { hours: WEEK.map((day) => ({ ...day, weekday: 1 })) },
      'hours',
    ],
    [
      'a closed day with hours',
      { hours: [...WEEK_OPEN, { weekday: 7, closed: true, opensAt: '10:00' }] },
      'hours.6.opensAt',
    ],
    ['an unknown amenity', { amenities: ['sauna'] }, 'amenities.0'],
    [
      'a maintenance note on an active facility',
      { maintenanceNote: 'Renovare' },
      'maintenanceNote',
    ],
    ['an unsupported duration', { minBookingMinutes: 45 }, 'minBookingMinutes'],
    ['a negative price', { pricePerHour: -1 }, 'pricePerHour'],
    ['zero capacity', { capacity: 0 }, 'capacity'],
  ])('answers 400 for %s', async (_, change, field) => {
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(admin))
      .send({ ...minimal, ...change });
    expect(res.status).toBe(400);
    expect(res.body.details.fields[field]).toBeDefined();
  });

  test('creates a facility with defaults from the minimal fields', async () => {
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(admin))
      .send(minimal);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Sala mica',
      sport: { id: 2, name: 'Baschet' },
      pricePerHour: 0,
      hours: null,
      minBookingMinutes: 60,
      amenities: [],
      status: 'active',
      maintenanceNote: null,
      images: [],
    });
  });

  test('creates a facility with every field and a week of hours', async () => {
    const res = await request(app)
      .post('/api/v1/facilities')
      .set(auth(admin))
      .send({
        sportId: 1,
        name: '  Teren fotbal B  ',
        location: 'Complex sportiv, Corp C',
        capacity: 10,
        description: 'Teren nou.',
        pricePerHour: 45.5,
        hours: WEEK,
        minBookingMinutes: 90,
        amenities: ['parcare', 'vestiare'],
        status: 'maintenance',
        maintenanceNote: 'Se montează porțile',
      });
    expect(res.status).toBe(201);
    const saved = await request(app).get(`/api/v1/facilities/${res.body.id}`);
    expect(saved.body).toMatchObject({
      name: 'Teren fotbal B',
      pricePerHour: 45.5,
      minBookingMinutes: 90,
      amenities: ['parcare', 'vestiare'],
      maintenanceNote: 'Se montează porțile',
    });
    expect(saved.body.hours[6]).toEqual({
      weekday: 7,
      closed: true,
      opensAt: null,
      closesAt: null,
    });
    expect(saved.body.hours[0].opensAt).toBe('09:00');
  });
});

describe('PATCH /api/v1/facilities/{facilityId}', () => {
  const patch = (id, body, token = admin) =>
    request(app).patch(`/api/v1/facilities/${id}`).set(auth(token)).send(body);

  test('needs the admin role and an existing facility', async () => {
    expect((await patch(1, { capacity: 15 }, student)).status).toBe(403);
    expect((await patch(9999, { capacity: 15 })).status).toBe(404);
  });

  test('answers 400 for an empty body, an unknown sport or a bad id', async () => {
    expect((await patch(1, {})).status).toBe(400);
    const sport = await patch(1, { sportId: 999 });
    expect(sport.status).toBe(400);
    expect(sport.body.details.fields.sportId).toBeDefined();
    const id = await request(app)
      .patch('/api/v1/facilities/abc')
      .set(auth(admin))
      .send({ capacity: 3 });
    expect(id.status).toBe(400);
    expect(id.body.details.fields.facilityId).toBeDefined();
  });

  test('keeps the note only while in maintenance', async () => {
    const refused = await patch(2, { maintenanceNote: 'Curățenie' });
    expect(refused.status).toBe(400);
    const inMaintenance = await patch(2, {
      status: 'maintenance',
      maintenanceNote: 'Curățenie',
    });
    expect(inMaintenance.body.maintenanceNote).toBe('Curățenie');
    const reworded = await patch(2, { maintenanceNote: 'Curățenie generală' });
    expect(reworded.body.maintenanceNote).toBe('Curățenie generală');
    const back = await patch(2, { status: 'active' });
    expect(back.body).toMatchObject({
      status: 'active',
      maintenanceNote: null,
    });
    const publicList = await request(app).get('/api/v1/facilities');
    expect(publicList.body.map((f) => f.id)).toContain(2);
  });

  test('changes only the sent fields and keeps the hours', async () => {
    const res = await patch(3, { pricePerHour: 50, amenities: [] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Teren tenis 1',
      capacity: 4,
      pricePerHour: 50,
      amenities: [],
    });
    expect(res.body.hours).toHaveLength(7);
  });

  test('replaces the week, or removes the hours with null', async () => {
    const replaced = await patch(2, { hours: WEEK });
    expect(replaced.body.hours[6].closed).toBe(true);
    const removed = await patch(2, { hours: null });
    expect(removed.body.hours).toBeNull();
  });

  test('deactivates (hidden from users) and reactivates a facility', async () => {
    const off = await patch(1, { status: 'inactive' });
    expect(off.body.status).toBe('inactive');
    expect((await request(app).get('/api/v1/facilities/1')).status).toBe(404);
    const list = await request(app).get('/api/v1/facilities');
    expect(list.body.map((f) => f.id)).not.toContain(1);
    const seenByAdmin = await request(app)
      .get('/api/v1/facilities/1')
      .set(auth(admin));
    expect(seenByAdmin.status).toBe(200);

    const on = await patch(1, { status: 'active' });
    expect(on.body.status).toBe('active');
    expect((await request(app).get('/api/v1/facilities/1')).status).toBe(200);
  });
});
