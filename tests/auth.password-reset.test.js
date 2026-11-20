const jwt = require('jsonwebtoken');
const request = require('supertest');

const app = require('../src/app');
const env = require('../src/config/env');
const { sequelize, User } = require('../src/models');
const mailService = require('../src/services/mail.service');
const { PASSWORD } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

const REQUEST_URL = '/api/v1/auth/password-reset';
const CONFIRM_URL = '/api/v1/auth/password-reset/confirm';

let sendMail;

function login(email, password) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

// The service sends without waiting (see password-reset.service.js), so the
// test polls the spy. The spy still calls nodemailer's JSON transport.
async function waitForEmails(count) {
  for (let i = 0; i < 50 && sendMail.mock.calls.length < count; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return sendMail.mock.calls.map(([message]) => message);
}

function tokenFromLink(text) {
  const match = text.match(/\/resetare-parola\?token=(\S+)/);
  return decodeURIComponent(match[1]);
}

async function requestToken(email) {
  const before = sendMail.mock.calls.length;
  const res = await request(app).post(REQUEST_URL).send({ email });
  expect(res.status).toBe(202);
  const emails = await waitForEmails(before + 1);
  return tokenFromLink(emails[before].text);
}

beforeAll(() => resetDatabase());
beforeEach(() => {
  sendMail = jest.spyOn(mailService.getTransport(), 'sendMail');
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => sequelize.close());

describe('POST /api/v1/auth/password-reset', () => {
  test('answers 400 for a malformed email', async () => {
    const res = await request(app)
      .post(REQUEST_URL)
      .send({ email: 'nu-e-email' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.email).toBeDefined();
  });

  test('answers 202 for an unknown email and sends nothing', async () => {
    const res = await request(app)
      .post(REQUEST_URL)
      .send({ email: 'nimeni@campus.test' });
    expect(res.status).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('answers 202 for a known email and emails a link to the user', async () => {
    const res = await request(app)
      .post(REQUEST_URL)
      .send({ email: 'Bogdan@Campus.test' });
    expect(res.status).toBe(202);
    const [email] = await waitForEmails(1);
    expect(email.to).toBe('bogdan@campus.test');
    expect(email.subject).toMatch(/Resetarea parolei/);
    expect(email.text).toContain(`${env.appUrl}/resetare-parola?token=`);
  });

  test('still answers 202 when the email cannot be sent', async () => {
    sendMail.mockRejectedValue(new Error('SMTP down'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)
      .post(REQUEST_URL)
      .send({ email: 'carmen@campus.test' });
    expect(res.status).toBe(202);
    await waitForEmails(1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(log).toHaveBeenCalled();
  });
});

describe('POST /api/v1/auth/password-reset/confirm', () => {
  test('sets the new password with the emailed token, once', async () => {
    const token = await requestToken('ana@campus.test');

    const res = await request(app)
      .post(CONFIRM_URL)
      .send({ token, newPassword: 'parola-resetata' });
    expect(res.status).toBe(204);
    expect((await login('ana@campus.test', PASSWORD)).status).toBe(401);
    expect((await login('ana@campus.test', 'parola-resetata')).status).toBe(
      200,
    );

    const again = await request(app)
      .post(CONFIRM_URL)
      .send({ token, newPassword: 'alta-parola' });
    expect(again.status).toBe(410);
    expect(again.body.code).toBe('RESET_TOKEN_INVALID');
  });

  test('rejects a valid token with an invalid new password (400)', async () => {
    const token = await requestToken('prof.radu@campus.test');
    const res = await request(app)
      .post(CONFIRM_URL)
      .send({ token, newPassword: 'scurt' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.newPassword).toMatch(/8 caractere/);
  });

  test('answers 400 when the token is missing', async () => {
    const res = await request(app)
      .post(CONFIRM_URL)
      .send({ newPassword: 'parola-noua' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.token).toBeDefined();
  });

  describe('answers 410 RESET_TOKEN_INVALID', () => {
    async function confirmWith(token) {
      return request(app)
        .post(CONFIRM_URL)
        .send({ token, newPassword: 'parola-noua' });
    }

    async function radu() {
      return User.findOne({ where: { email: 'prof.radu@campus.test' } });
    }

    test('for an expired token', async () => {
      const user = await radu();
      const token = jwt.sign(
        { purpose: 'password-reset' },
        env.jwtSecret + user.passwordHash,
        { subject: String(user.id), expiresIn: -10 },
      );
      expect((await confirmWith(token)).status).toBe(410);
    });

    test('for a login token', async () => {
      const { body } = await login('prof.radu@campus.test', PASSWORD);
      expect((await confirmWith(body.token)).status).toBe(410);
    });

    test('for a token signed for another purpose', async () => {
      const user = await radu();
      const token = jwt.sign({}, env.jwtSecret + user.passwordHash, {
        subject: String(user.id),
      });
      expect((await confirmWith(token)).status).toBe(410);
    });

    test('for a token issued before a password change', async () => {
      const token = await requestToken('prof.radu@campus.test');
      const { body } = await login('prof.radu@campus.test', PASSWORD);
      await request(app)
        .post('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${body.token}`)
        .send({
          currentPassword: PASSWORD,
          newPassword: 'schimbata-intre-timp',
        })
        .expect(204);
      expect((await confirmWith(token)).status).toBe(410);
    });

    test('for an unsigned (alg none) token', async () => {
      const user = await radu();
      const token = jwt.sign({ purpose: 'password-reset' }, null, {
        algorithm: 'none',
        subject: String(user.id),
      });
      expect((await confirmWith(token)).status).toBe(410);
    });

    test('for a subject that is not a valid user id', async () => {
      for (const subject of ['abc', '99999999999', '0']) {
        const token = jwt.sign({ purpose: 'password-reset' }, 'x', { subject });
        expect((await confirmWith(token)).status).toBe(410);
      }
    });

    test('for garbage and for an unknown user', async () => {
      expect((await confirmWith('nu-e-un-token')).status).toBe(410);
      const ghost = jwt.sign({ purpose: 'password-reset' }, 'x', {
        subject: '999999',
      });
      expect((await confirmWith(ghost)).status).toBe(410);
    });
  });
});
