// First migration: db/schema.sql (v3) exactly as it is (DESIGN §4, "Data
// model"). Later schema changes go in new migrations.
const fs = require('node:fs/promises');
const path = require('node:path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const schema = await fs.readFile(
      path.join(__dirname, '..', 'schema.sql'),
      'utf8',
    );
    await queryInterface.sequelize.query(schema);
  },

  // Drops everything schema.sql created; SequelizeMeta stays, because
  // sequelize-cli removes this migration's row from it afterwards.
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE item record;
      BEGIN
        FOR item IN SELECT viewname FROM pg_views
                    WHERE schemaname = 'public' LOOP
          EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', item.viewname);
        END LOOP;
        FOR item IN SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public'
                      AND tablename <> 'SequelizeMeta' LOOP
          EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', item.tablename);
        END LOOP;
        FOR item IN SELECT t.typname FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
          EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', item.typname);
        END LOOP;
      END $$;
    `);
  },
};
