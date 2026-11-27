const request = require('supertest');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

// Seed accounts: 1 admin, 2 Ana, 3 Bogdan, 4 Carmen, 5 Dan (already
// blocked, sanction 1), 6 a teacher.
const ADMIN_ID = 1;

let admin;
let student;

const DAY_MS = 24 * 60 * 60 * 1000;
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const block = (userId, body, token = admin) =>
  request(app)
    .post(`/api/v1/users/${userId}/sanctions`)
    .set(auth(token))
    .send(body);
const lift = (sanctionId, body = { lifted: true }, token = admin) =>
  request(app)
    .patch(`/api/v1/sanctions/${sanctionId}`)
    .set(auth(token))
    .send(body);
const userOf = async (userId) =>
  (await request(app).get(`/api/v1/users/${userId}`).set(auth(admin))).body;

async function insertSanction(userId, endsAt) {
  const [[row]] = await sequelize.query(
    `INSERT INTO sanctions (user_id, reason, ends_at)
     VALUES (:userId, 'Adăugată direct', :endsAt) RETURNING id`,
    { replacements: { userId, endsAt } },
  );
  return row.id;
}

beforeAll(async () => {
  resetDatabase();
  [admin, student] = await Promise.all([
    tokenFor('admin@campus.test'),
    tokenFor('ana@campus.test'),
  ]);
});
afterAll(() => sequelize.close());

describe('POST /api/v1/users/{userId}/sanctions', () => {
  test('needs a token (401) and the admin role (403)', async () => {
    const anonymous = await request(app)
      .post('/api/v1/users/3/sanctions')
      .send({ reason: 'x' });
    expect(anonymous.status).toBe(401);
    expect((await block(3, { reason: 'x' }, student)).status).toBe(403);
  });

  test('blocks the account with the defaults from booking_rules', async () => {
    const before = Date.now();
    const res = await block(3, { reason: '  Comportament nepotrivit  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: 3,
      reason: 'Comportament nepotrivit',
      fineAmount: 100,
      active: true,
      liftedAt: null,
      liftMethod: null,
    });
    // ban_months = 6 in the seed rules.
    const endsAt = new Date(res.body.endsAt).getTime();
    expect(endsAt).toBeGreaterThan(before + 180 * DAY_MS);
    expect(endsAt).toBeLessThan(before + 186 * DAY_MS);
    expect(await userOf(3)).toMatchObject({
      status: 'blocked',
      blockedUntil: res.body.endsAt,
    });
  });

  test('takes a chosen end and fine', async () => {
    const endsAt = new Date(Date.now() + 30 * DAY_MS).toISOString();
    const res = await block(4, { reason: 'Test', endsAt, fineAmount: 25.5 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ endsAt, fineAmount: 25.5 });
  });

  test('refuses an account that is already blocked (409)', async () => {
    for (const userId of [3, 5]) {
      const res = await block(userId, { reason: 'Încă o dată' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_BLOCKED');
    }
  });

  test('never blocks an admin (403), 404 for an unknown user', async () => {
    const forAdmin = await block(ADMIN_ID, { reason: 'x' });
    expect(forAdmin.status).toBe(403);
    expect(forAdmin.body).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Contul unui administrator nu poate fi blocat.',
    });
    const missing = await block(999999, { reason: 'x' });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });

  test('answers 400 for invalid data', async () => {
    const fieldsOf = async (body) => {
      const res = await block(6, body);
      expect(res.status).toBe(400);
      return Object.keys(res.body.details.fields).sort();
    };
    expect(await fieldsOf({})).toEqual(['reason']);
    expect(await fieldsOf({ reason: '   ' })).toEqual(['reason']);
    expect(await fieldsOf({ reason: 'x'.repeat(201) })).toEqual(['reason']);
    expect(
      await fieldsOf({ reason: 'x', endsAt: '2020-01-01T00:00:00Z' }),
    ).toEqual(['endsAt']);
    expect(await fieldsOf({ reason: 'x', fineAmount: -1 })).toEqual([
      'fineAmount',
    ]);
    expect(await fieldsOf({ reason: 'x', fineAmount: 1.005 })).toEqual([
      'fineAmount',
    ]);
    // Nothing was written by the refused requests.
    expect((await userOf(6)).status).toBe('active');
  });
});

describe('PATCH /api/v1/sanctions/{sanctionId}', () => {
  test('lifts the sanction and reopens the account', async () => {
    const [current] = (
      await request(app).get('/api/v1/users/3/sanctions').set(auth(admin))
    ).body;
    const res = await lift(current.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: current.id,
      active: false,
      liftedBy: ADMIN_ID,
      liftMethod: 'admin',
    });
    expect(res.body.liftedAt).not.toBeNull();
    expect(await userOf(3)).toMatchObject({
      status: 'active',
      blockedUntil: null,
    });
    // Lifted, so the account can be blocked again.
    expect((await block(3, { reason: 'A doua oară' })).status).toBe(201);
  });

  test('keeps the account blocked while another sanction is active', async () => {
    const later = new Date(Date.now() + 90 * DAY_MS);
    await insertSanction(4, later);
    const fromApi = (
      await request(app).get('/api/v1/users/4/sanctions').set(auth(admin))
    ).body.find((sanction) => sanction.reason === 'Test');
    expect((await lift(fromApi.id)).status).toBe(200);
    const user = await userOf(4);
    expect(user.status).toBe('blocked');
    expect(new Date(user.blockedUntil).getTime()).toBe(later.getTime());
  });

  test('lifts a sanction already past its end', async () => {
    const expired = await insertSanction(2, new Date(Date.now() - DAY_MS));
    const res = await lift(expired);
    expect(res.status).toBe(200);
    expect(res.body.liftMethod).toBe('admin');
    expect((await userOf(2)).status).toBe('active');
  });

  test('answers 409 the second time, 404 and 400 for bad requests', async () => {
    const again = await lift(1);
    expect(again.status).toBe(200);
    const twice = await lift(1);
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe('ALREADY_LIFTED');
    expect((await lift(999999)).status).toBe(404);
    const wrongBody = await lift(1, { lifted: false });
    expect(wrongBody.status).toBe(400);
    expect(wrongBody.body.details.fields).toHaveProperty('lifted');
    expect((await lift(1, { lifted: true }, student)).status).toBe(403);
  });
});

describe('GET /api/v1/users/{userId}/sanctions', () => {
  test('lists the active sanction first, then the newest', async () => {
    const res = await request(app)
      .get('/api/v1/users/4/sanctions')
      .set(auth(admin));
    expect(res.status).toBe(200);
    expect(
      res.body.map((sanction) => [sanction.reason, sanction.active]),
    ).toEqual([
      ['Adăugată direct', true],
      ['Test', false],
    ]);
  });

  test('is admin only and answers 404 for an unknown user', async () => {
    const forStudent = await request(app)
      .get('/api/v1/users/4/sanctions')
      .set(auth(student));
    expect(forStudent.status).toBe(403);
    const missing = await request(app)
      .get('/api/v1/users/999999/sanctions')
      .set(auth(admin));
    expect(missing.status).toBe(404);
  });
});
