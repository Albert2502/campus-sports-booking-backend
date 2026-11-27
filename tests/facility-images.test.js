const fs = require('node:fs');
const path = require('node:path');

const request = require('supertest');

const app = require('../src/app');
const env = require('../src/config/env');
const { sequelize } = require('../src/models');
const { tokenFor } = require('./helpers/auth');
const { resetDatabase } = require('./helpers/db');

// Only the first bytes decide the type, so tiny buffers are enough.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32, 2),
]);
const GIF = Buffer.from('GIF89a-not-allowed');

let admin;
let student;

function upload(facilityId, buffer, options = {}) {
  const {
    token = admin,
    field = 'image',
    filename = 'poza.png',
    contentType = 'image/png',
  } = options;
  return request(app)
    .post(`/api/v1/facilities/${facilityId}/images`)
    .set('Authorization', `Bearer ${token}`)
    .attach(field, buffer, { filename, contentType });
}

function remove(facilityId, imageId, token = admin) {
  return request(app)
    .delete(`/api/v1/facilities/${facilityId}/images/${imageId}`)
    .set('Authorization', `Bearer ${token}`);
}

async function newFacility() {
  const res = await request(app)
    .post('/api/v1/facilities')
    .set('Authorization', `Bearer ${admin}`)
    .send({ sportId: 1, name: 'Teren de test', capacity: 2 });
  return res.body.id;
}

function filesOf(facilityId) {
  const dir = path.join(env.uploadsDir, 'facilities', String(facilityId));
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}

beforeAll(async () => {
  resetDatabase();
  fs.rmSync(env.uploadsDir, { recursive: true, force: true });
  admin = await tokenFor('admin@campus.test');
  student = await tokenFor('ana@campus.test');
});
afterAll(async () => {
  fs.rmSync(env.uploadsDir, { recursive: true, force: true });
  await sequelize.close();
});

test('the tests write to a temporary folder, not uploads/', () => {
  expect(env.uploadsDir).toMatch(/campus-sports-test-uploads$/);
});

describe('POST /api/v1/facilities/{facilityId}/images', () => {
  test('needs a token (401) and the admin role (403)', async () => {
    const anonymous = await request(app)
      .post('/api/v1/facilities/1/images')
      .attach('image', PNG, 'poza.png');
    expect(anonymous.status).toBe(401);
    expect((await upload(1, PNG, { token: student })).status).toBe(403);
  });

  test('answers 404 for a facility that does not exist', async () => {
    const res = await upload(9999, PNG);
    expect(res.status).toBe(404);
    expect(filesOf(9999)).toEqual([]);
  });

  test('answers 400 without a file or with another field name', async () => {
    const empty = await request(app)
      .post('/api/v1/facilities/1/images')
      .set('Authorization', `Bearer ${admin}`);
    expect(empty.status).toBe(400);
    expect(empty.body.details.fields.image).toBe('Alege o imagine.');
    const wrongField = await upload(1, PNG, { field: 'photo' });
    expect(wrongField.status).toBe(400);
    expect(wrongField.body.details.fields.image).toBeDefined();
  });

  test('answers 400 for a file that is not JPG or PNG, whatever its name', async () => {
    const res = await upload(1, GIF, {
      filename: 'pacalit.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.image).toBe('Doar imagini JPG sau PNG.');
    expect(filesOf(1)).toEqual([]);
  });

  test('answers 400 for a file over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(1, big);
    expect(res.status).toBe(400);
    expect(res.body.details.fields.image).toBe('Imaginea are cel mult 5 MB.');
  });

  test('accepts a file of exactly 5 MB', async () => {
    const exact = Buffer.concat([
      PNG,
      Buffer.alloc(5 * 1024 * 1024 - PNG.length),
    ]);
    const res = await upload(await newFacility(), exact);
    expect(res.status).toBe(201);
  });

  test('answers 400 for an extra text field or a broken multipart body', async () => {
    const extra = await request(app)
      .post('/api/v1/facilities/1/images')
      .set('Authorization', `Bearer ${admin}`)
      .field('note', 'x')
      .attach('image', PNG, 'poza.png');
    expect(extra.status).toBe(400);
    expect(extra.body.details.fields.image).toBeDefined();
    const broken = await request(app)
      .post('/api/v1/facilities/1/images')
      .set('Authorization', `Bearer ${admin}`)
      .set('Content-Type', 'multipart/form-data; boundary=xyz')
      .send(
        '--xyz\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\n\r\nabc',
      );
    expect(broken.status).toBe(400);
    expect(broken.body.code).toBe('VALIDATION_ERROR');
  });

  test('stores PNG and JPG images in order, served from /uploads', async () => {
    const png = await upload(1, PNG);
    expect(png.status).toBe(201);
    expect(png.body).toMatchObject({ position: 0 });
    expect(png.body.url).toMatch(
      /^\/uploads\/facilities\/1\/[0-9a-f]{32}\.png$/,
    );

    const jpg = await upload(1, JPG, {
      filename: 'poza.jpeg',
      contentType: 'image/jpeg',
    });
    expect(jpg.status).toBe(201);
    expect(jpg.body.position).toBe(1);
    expect(jpg.body.url).toMatch(/\.jpg$/);

    const served = await request(app).get(png.body.url);
    expect(served.status).toBe(200);
    expect(Buffer.compare(served.body, PNG)).toBe(0);

    const facility = await request(app).get('/api/v1/facilities/1');
    expect(facility.body.images.map((image) => image.id)).toEqual([
      png.body.id,
      jpg.body.id,
    ]);
    expect(filesOf(1)).toHaveLength(2);
  });

  test('refuses a 6th image with 422 and leaves no file behind', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await upload(2, PNG)).status).toBe(201);
    }
    const res = await upload(2, PNG);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('IMAGE_LIMIT_REACHED');
    expect(filesOf(2)).toHaveLength(5);
  });

  test('lets only one of two simultaneous uploads take the last place', async () => {
    for (let i = 0; i < 4; i += 1) {
      await upload(3, PNG);
    }
    const results = await Promise.all([upload(3, PNG), upload(3, JPG)]);
    expect(results.map((res) => res.status).sort()).toEqual([201, 422]);
    expect(filesOf(3)).toHaveLength(5);
  });
});

describe('DELETE /api/v1/facilities/{facilityId}/images/{imageId}', () => {
  test('removes the image and its file', async () => {
    const { body: image } = await upload(4, PNG);
    expect(filesOf(4)).toHaveLength(1);

    expect((await remove(4, image.id, student)).status).toBe(403);
    expect((await remove(4, image.id)).status).toBe(204);
    expect(filesOf(4)).toEqual([]);
    const facility = await request(app)
      .get('/api/v1/facilities/4')
      .set('Authorization', `Bearer ${admin}`);
    expect(facility.body.images).toEqual([]);

    expect((await remove(4, image.id)).status).toBe(404);
  });

  test('gives a new upload the next position after a delete', async () => {
    const id = await newFacility();
    const first = await upload(id, PNG);
    const second = await upload(id, PNG);
    await remove(id, first.body.id);
    const third = await upload(id, PNG);
    expect(third.body.position).toBe(second.body.position + 1);
  });

  test('answers 404 for an image of another facility, 400 for a bad id', async () => {
    const { body: image } = await upload(4, PNG);
    expect((await remove(1, image.id)).status).toBe(404);
    expect(filesOf(4)).toHaveLength(1);
    const bad = await remove(4, 'abc');
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields.imageId).toBeDefined();
  });
});
