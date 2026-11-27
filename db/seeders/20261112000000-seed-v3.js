// The seeder: db/seed.sql exactly as it is (it matches the schema after all
// migrations, DESIGN §5, 6). Its password hashes are
// placeholders; `npm run db:dev-passwords` makes the accounts usable locally.
const fs = require('node:fs/promises');
const path = require('node:path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const seed = await fs.readFile(
      path.join(__dirname, '..', 'seed.sql'),
      'utf8',
    );
    await queryInterface.sequelize.query(seed);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE item record;
      BEGIN
        FOR item IN SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public'
                      AND tablename <> 'SequelizeMeta' LOOP
          EXECUTE format('TRUNCATE %I RESTART IDENTITY CASCADE',
                         item.tablename);
        END LOOP;
      END $$;
    `);
  },
};
