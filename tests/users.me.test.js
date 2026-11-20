const request = require('supertest');

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

beforeAll(() => resetDatabase());
afterAll(() => sequelize.close());

describe('GET /api/v1/users/me', () => {
  test('without a token answers 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('with a forged token answers 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('returns the student profile with limit and no no-shows', async () => {
    const token = await tokenFor('ana@campus.test');
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'ana@campus.test',
      fullName: 'Ana Popescu',
      role: 'student',
      status: 'active',
      blockedUntil: null,
      monthlyLimit: 1,
      noShowCount: 0,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('counts the no-shows of the blocked account', async () => {
    const token = await tokenFor('dan@campus.test');
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('blocked');
    expect(res.body.blockedUntil).not.toBeNull();
    expect(res.body.noShowCount).toBe(2);
  });

  test("counts only no-show incidents, and only the user's own", async () => {
    // Ana: a rule violation (not a no-show); Bogdan: a no-show (not Ana's).
    await sequelize.query(
      `INSERT INTO incidents (user_id, type, description) VALUES
         (2, 'rule_violation', 'test'), (3, 'no_show', 'test')`,
    );
    const token = await tokenFor('ana@campus.test');
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.noShowCount).toBe(0);
  });

  test('login returns the same profile, with noShowCount', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dan@campus.test', password: 'parola123' });
    expect(res.status).toBe(200);
    expect(res.body.user.noShowCount).toBe(2);
  });

  test('gives teachers no monthly limit', async () => {
    const token = await tokenFor('prof.radu@campus.test');
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.monthlyLimit).toBeNull();
  });
});
