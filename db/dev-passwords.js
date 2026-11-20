// Gives the seed accounts a real password for local development: seed.sql
// stores placeholder hashes such as 'hash_ana', which bcrypt never matches.
const bcrypt = require('bcrypt');

const { sequelize, User } = require('../src/models');

const DEV_PASSWORD = 'parola123';
const BCRYPT_ROUNDS = 10;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:dev-passwords is for local databases only.');
  }
  // Accounts that already have a bcrypt hash keep their password. The check
  // runs here: Sequelize 6 reads the "$2" of a LIKE pattern as a bind
  // parameter.
  const users = await User.findAll({ attributes: ['id', 'passwordHash'] });
  const ids = users
    .filter((user) => !user.passwordHash.startsWith('$2'))
    .map((user) => user.id);
  if (ids.length > 0) {
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);
    await User.update({ passwordHash }, { where: { id: ids } });
  }
  console.log(`${ids.length} accounts now use the password ${DEV_PASSWORD}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
