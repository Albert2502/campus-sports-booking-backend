const request = require('supertest');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

let admin;
let student;

beforeAll(async () => {
  resetDatabase();
  [admin, student] = await Promise.all([
    tokenFor('admin@campus.test'),
    tokenFor('ana@campus.test'),
  ]);
});
afterAll(() => sequelize.close());

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const listUsers = (query) =>
  request(app).get('/api/v1/users').query(query).set(auth(admin));

describe('GET /api/v1/users', () => {
  test('needs a token (401) and the admin role (403)', async () => {
    expect((await request(app).get('/api/v1/users')).status).toBe(401);
    const res = await request(app).get('/api/v1/users').set(auth(student));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('returns the first page sorted by name, with the profile figures', async () => {
    const res = await listUsers();
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 6 });
    expect(res.body.items.map((user) => user.fullName)).toEqual([
      'Administrator Campus',
      'Ana Popescu',
      'Bogdan Ionescu',
      'Carmen Dumitru',
      'Dan Marin',
      'Prof. Radu Stan',
    ]);
    const dan = res.body.items[4];
    expect(dan).toMatchObject({
      email: 'dan@campus.test',
      role: 'student',
      status: 'blocked',
      monthlyLimit: 1,
      noShowCount: 2,
    });
    expect(dan.blockedUntil).not.toBeNull();
    expect(dan).not.toHaveProperty('passwordHash');
    // The limit does not apply to teachers in the seed rules.
    expect(res.body.items[5].monthlyLimit).toBeNull();
  });

  test('filters by role and status and searches name or email', async () => {
    const emails = async (query) =>
      (await listUsers(query)).body.items.map((user) => user.email);
    expect(await emails({ role: 'teacher' })).toEqual([
      'prof.radu@campus.test',
    ]);
    expect(await emails({ status: 'blocked' })).toEqual(['dan@campus.test']);
    expect(await emails({ q: 'POPESCU' })).toEqual(['ana@campus.test']);
    expect(await emails({ q: 'bogdan@' })).toEqual(['bogdan@campus.test']);
    expect(await emails({ q: '  ', role: 'admin' })).toEqual([
      'admin@campus.test',
    ]);
    // A literal search: % does not match everything.
    expect(await emails({ q: '%' })).toEqual([]);
  });

  test('pages through the results', async () => {
    const res = await listUsers({ page: 2, pageSize: 4 });
    expect(res.body.meta).toEqual({ page: 2, pageSize: 4, total: 6 });
    expect(res.body.items.map((user) => user.fullName)).toEqual([
      'Dan Marin',
      'Prof. Radu Stan',
    ]);
    const past = await listUsers({ page: 9 });
    expect(past.body).toEqual({
      items: [],
      meta: { page: 9, pageSize: 20, total: 6 },
    });
  });

  test('answers 400 for invalid filters', async () => {
    const res = await listUsers({ role: 'guest', page: 0, pageSize: 101 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details.fields).sort()).toEqual([
      'page',
      'pageSize',
      'role',
    ]);
  });
});

describe('GET /api/v1/users/{userId}', () => {
  test('returns one profile to the admin', async () => {
    const res = await request(app).get('/api/v1/users/2').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 2,
      fullName: 'Ana Popescu',
      role: 'student',
      status: 'active',
      monthlyLimit: 1,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('is admin only, 404 for an unknown id, 400 for a malformed one', async () => {
    const forStudent = await request(app)
      .get('/api/v1/users/3')
      .set(auth(student));
    expect(forStudent.status).toBe(403);
    const missing = await request(app)
      .get('/api/v1/users/999999')
      .set(auth(admin));
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
    const malformed = await request(app)
      .get('/api/v1/users/abc')
      .set(auth(admin));
    expect(malformed.status).toBe(400);
    expect(malformed.body.details.fields).toHaveProperty('userId');
  });

  test('keeps /users/me for every signed-in user', async () => {
    const res = await request(app).get('/api/v1/users/me').set(auth(student));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@campus.test');
  });
});
