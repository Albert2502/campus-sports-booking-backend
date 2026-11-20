const jwt = require('jsonwebtoken');
const request = require('supertest');

const app = require('../src/app');
const env = require('../src/config/env');
const { sequelize, User } = require('../src/models');
const { PASSWORD, tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

const URL = '/api/v1/users/me/password';

function login(email, password) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

beforeAll(() => resetDatabase());
afterAll(() => sequelize.close());

describe('POST /api/v1/users/me/password', () => {
  test('without a token answers 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post(URL)
      .send({ currentPassword: PASSWORD, newPassword: 'parola-noua' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  describe('with invalid data answers 400 VALIDATION_ERROR', () => {
    let token;
    beforeAll(async () => {
      token = await tokenFor('bogdan@campus.test');
    });

    async function send(body) {
      return request(app)
        .post(URL)
        .set('Authorization', `Bearer ${token}`)
        .send(body);
    }

    test('for an empty body, on both fields', async () => {
      const res = await send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(res.body.details.fields).sort()).toEqual([
        'currentPassword',
        'newPassword',
      ]);
    });

    test('for a new password under 8 characters', async () => {
      const res = await send({
        currentPassword: PASSWORD,
        newPassword: 'scurt',
      });
      expect(res.status).toBe(400);
      expect(res.body.details.fields.newPassword).toMatch(/8 caractere/);
    });

    test('for a new password over 72 bytes', async () => {
      const res = await send({
        currentPassword: PASSWORD,
        newPassword: 'a'.repeat(73),
      });
      expect(res.status).toBe(400);
      expect(res.body.details.fields.newPassword).toMatch(/prea lungă/);
    });

    test('counting bytes, not characters (40 × "ă" = 80 bytes)', async () => {
      const res = await send({
        currentPassword: PASSWORD,
        newPassword: 'ă'.repeat(40),
      });
      expect(res.status).toBe(400);
      expect(res.body.details.fields.newPassword).toMatch(/prea lungă/);
    });

    test('for a new password equal to the current one', async () => {
      const res = await send({
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
      });
      expect(res.status).toBe(400);
      expect(res.body.details.fields.newPassword).toMatch(/diferită/);
    });
  });

  test('with a wrong current password answers 422 and keeps the password', async () => {
    const token = await tokenFor('carmen@campus.test');
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'gresita123', newPassword: 'parola-noua' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('WRONG_PASSWORD');
    expect((await login('carmen@campus.test', PASSWORD)).status).toBe(200);
  });

  test('changes the password: only the new one signs in afterwards', async () => {
    const token = await tokenFor('ana@campus.test');
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'parola-noua' });
    expect(res.status).toBe(204);
    expect((await login('ana@campus.test', PASSWORD)).status).toBe(401);
    expect((await login('ana@campus.test', 'parola-noua')).status).toBe(200);
    const ana = await User.findOne({ where: { email: 'ana@campus.test' } });
    expect(ana.passwordHash).toMatch(/^\$2[aby]\$10\$/);
  });

  test('accepts a new password of exactly 72 bytes', async () => {
    const token = await tokenFor('prof.radu@campus.test');
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'b'.repeat(72) });
    expect(res.status).toBe(204);
    expect((await login('prof.radu@campus.test', 'b'.repeat(72))).status).toBe(
      200,
    );
  });

  test('answers 401 when the account behind the token is gone', async () => {
    const ghost = await User.create({
      email: 'ghost@campus.test',
      passwordHash: 'x',
      fullName: 'Ghost',
      role: 'student',
      status: 'active',
      createdAt: new Date(),
    });
    const token = jwt.sign({ role: 'student' }, env.jwtSecret, {
      subject: String(ghost.id),
    });
    await ghost.destroy();
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'parola-noua' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('lets a blocked account change its password too', async () => {
    const signIn = await login('dan@campus.test', PASSWORD);
    expect(signIn.body.user.status).toBe('blocked');
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${signIn.body.token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'parola-noua' });
    expect(res.status).toBe(204);
    expect((await login('dan@campus.test', 'parola-noua')).status).toBe(200);
  });
});
