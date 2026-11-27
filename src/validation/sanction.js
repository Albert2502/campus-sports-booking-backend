const z = require('zod');

const { id } = require('./user');

/** POST /users/{userId}/sanctions: the defaults come from booking_rules. */
const createSanctionBody = z.object({
  reason: z
    .string({ error: 'Scrie motivul blocării.' })
    .trim()
    .min(1, { error: 'Scrie motivul blocării.' })
    .max(200, { error: 'Motivul are cel mult 200 de caractere.' }),
  endsAt: z.iso
    .datetime({ offset: true, error: 'Sfârșitul blocării este o dată cu oră.' })
    .transform((value) => new Date(value))
    .refine((date) => date > new Date(), {
      error: 'Sfârșitul blocării este în viitor.',
    })
    .optional(),
  fineAmount: z
    .number({ error: 'Amenda este un număr.' })
    .min(0, { error: 'Amenda nu poate fi negativă.' })
    // NUMERIC(8,2) in the database.
    .max(999999.99, { error: 'Amenda este prea mare.' })
    .multipleOf(0.01, { error: 'Amenda are cel mult două zecimale.' })
    .optional(),
});

/** PATCH /sanctions/{sanctionId}: lifting is the only change allowed. */
const liftSanctionBody = z.object({
  lifted: z.literal(true, { error: 'Trimite lifted: true.' }),
});

const sanctionParams = z.object({
  sanctionId: id('Id-ul sancțiunii este un număr.'),
});

module.exports = {
  createSanctionBody,
  liftSanctionBody,
  sanctionParams,
};
