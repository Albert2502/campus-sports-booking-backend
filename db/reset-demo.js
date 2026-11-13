// Rebuilds the demo database: schema.sql, one free football field with slots
// for the next two weeks, and the two demo accounts. Only databases whose name
// ends in _demo are dropped, so a real database is never touched by mistake.

const fs = require('node:fs/promises');
const path = require('node:path');

const bcrypt = require('bcrypt');
const { Client } = require('pg');

const env = require('../src/config/env');

const DEMO_DB_NAME = /^[a-z][a-z0-9_]*_demo$/;
const SLOT_HOURS = { first: 16, last: 21 };
const SLOT_DAYS = 14;

const DEMO_USERS = [
  {
    email: 'test@a.com',
    password: 'p1243',
    fullName: 'Andrei Popescu',
    role: 'student',
  },
  {
    email: 'ad@a.com',
    password: 'pas56p0',
    fullName: 'Administrator Campus',
    role: 'admin',
  },
];

const DEMO_FACILITY = {
  sport: 'Fotbal',
  name: 'Teren de fotbal A',
  location: 'Complex sportiv, Corp A',
  description: 'Teren cu gazon sintetic, vestiare, nocturnă și duș.',
  capacity: 6,
  pricePerHour: 0,
  opensAt: '08:00',
  closesAt: '22:00',
  image: 'teren-fotbal-a.svg',
};

async function recreateDatabase() {
  const name = env.db.database;
  if (!DEMO_DB_NAME.test(name)) {
    throw new Error(
      `DB_NAME "${name}" must end in _demo; this script drops the database.`,
    );
  }
  const admin = new Client({ ...env.db, database: 'postgres' });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
}

async function seed(client) {
  const { rows: sports } = await client.query(
    'INSERT INTO sports (name) VALUES ($1) RETURNING id',
    [DEMO_FACILITY.sport],
  );
  const { rows: facilities } = await client.query(
    `INSERT INTO facilities (sport_id, name, location, description, capacity,
                             price_per_hour, opens_at, closes_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      sports[0].id,
      DEMO_FACILITY.name,
      DEMO_FACILITY.location,
      DEMO_FACILITY.description,
      DEMO_FACILITY.capacity,
      DEMO_FACILITY.pricePerHour,
      DEMO_FACILITY.opensAt,
      DEMO_FACILITY.closesAt,
    ],
  );
  const facilityId = facilities[0].id;

  const imagePath = `facilities/${facilityId}/${DEMO_FACILITY.image}`;
  await client.query(
    'INSERT INTO facility_images (facility_id, path, position) VALUES ($1, $2, 0)',
    [facilityId, imagePath],
  );
  const target = path.join(__dirname, '..', 'uploads', imagePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(
    path.join(__dirname, 'demo-assets', DEMO_FACILITY.image),
    target,
  );

  // Local wall-clock hours (session time zone), so DST days keep 16:00-22:00.
  await client.query(
    `INSERT INTO time_slots (facility_id, starts_at, ends_at)
     SELECT $1,
            (d::date + make_time(h, 0, 0))::timestamptz,
            (d::date + make_time(h + 1, 0, 0))::timestamptz
     FROM generate_series(current_date, current_date + $2::int, '1 day') AS d,
          generate_series($3::int, $4::int) AS h`,
    [facilityId, SLOT_DAYS - 1, SLOT_HOURS.first, SLOT_HOURS.last],
  );

  for (const user of DEMO_USERS) {
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)`,
      [
        user.email,
        await bcrypt.hash(user.password, 10),
        user.fullName,
        user.role,
      ],
    );
  }
  await client.query('INSERT INTO booking_rules DEFAULT VALUES');
}

async function main() {
  await recreateDatabase();
  const client = new Client({
    ...env.db,
    options: `-c TimeZone=${env.timeZone}`,
  });
  await client.connect();
  try {
    const schema = await fs.readFile(
      path.join(__dirname, 'schema.sql'),
      'utf8',
    );
    await client.query(schema);
    await client.query('BEGIN');
    await seed(client);
    await client.query('COMMIT');
  } finally {
    await client.end();
  }
  console.log(
    `Database ${env.db.database} is ready: 1 facility, ${SLOT_DAYS} days of ` +
      `slots, ${DEMO_USERS.length} accounts.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
