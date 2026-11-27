const z = require('zod');

const AMENITIES = ['vestiare', 'nocturna', 'dus', 'echipament', 'parcare'];
const MIN_BOOKING_MINUTES = [30, 60, 90, 120];

const hourMinute = z
  .string({ error: 'Ora are forma HH:mm.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Ora are forma HH:mm.' });

const day = z
  .object({
    weekday: z
      .number({ error: 'Ziua este un număr de la 1 la 7.' })
      .int()
      .min(1, { error: 'Ziua este un număr de la 1 la 7.' })
      .max(7, { error: 'Ziua este un număr de la 1 la 7.' }),
    closed: z.boolean({ error: 'Spune dacă ziua este închisă.' }),
    opensAt: hourMinute.nullable().optional(),
    closesAt: hourMinute.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.closed) {
      if (value.opensAt || value.closesAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['opensAt'],
          message: 'O zi închisă nu are program.',
        });
      }
      return;
    }
    if (!value.opensAt || !value.closesAt) {
      ctx.addIssue({
        code: 'custom',
        path: [value.opensAt ? 'closesAt' : 'opensAt'],
        message: 'Completează ora de deschidere și de închidere.',
      });
    } else if (value.closesAt <= value.opensAt) {
      // 'HH:mm' strings compare in time order.
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'Ora de închidere este după cea de deschidere.',
      });
    }
  });

const hours = z
  .array(day)
  .length(7, { error: 'Programul are toate cele 7 zile.' })
  .refine((days) => new Set(days.map((d) => d.weekday)).size === 7, {
    error: 'Fiecare zi apare o singură dată.',
  })
  .nullable();

const optionalText = (max, message) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    // An emptied field means "no value".
    .transform((value) => (value === '' ? null : value))
    .nullable();

const fields = {
  sportId: z
    .number({ error: 'Alege sportul.' })
    .int({ error: 'Alege sportul.' })
    .positive({ error: 'Alege sportul.' }),
  name: z
    .string({ error: 'Introdu denumirea.' })
    .trim()
    .min(1, { error: 'Introdu denumirea.' })
    .max(120, { error: 'Denumirea are cel mult 120 de caractere.' }),
  location: optionalText(200, 'Locația are cel mult 200 de caractere.'),
  capacity: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Introdu capacitatea.'
          : 'Capacitatea este un număr.',
    })
    .int({ error: 'Capacitatea este un număr întreg.' })
    .min(1, { error: 'Capacitatea este cel puțin 1.' }),
  description: optionalText(1000, 'Descrierea are cel mult 1000 de caractere.'),
  pricePerHour: z
    .number({ error: 'Prețul este un număr.' })
    .min(0, { error: 'Prețul nu poate fi negativ.' })
    // NUMERIC(8,2) in the database.
    .max(999999.99, { error: 'Prețul este prea mare.' })
    .multipleOf(0.01, { error: 'Prețul are cel mult două zecimale.' }),
  hours,
  minBookingMinutes: z.union(
    MIN_BOOKING_MINUTES.map((value) => z.literal(value)),
    { error: 'Durata minimă este 30, 60, 90 sau 120 de minute.' },
  ),
  amenities: z
    .array(z.enum(AMENITIES, { error: 'Dotare necunoscută.' }))
    .refine((list) => new Set(list).size === list.length, {
      error: 'Fiecare dotare apare o singură dată.',
    }),
  status: z.enum(['active', 'maintenance', 'inactive'], {
    error: 'Starea este active, maintenance sau inactive.',
  }),
  maintenanceNote: optionalText(
    200,
    'Motivul mentenanței are cel mult 200 de caractere.',
  ),
};

const optional = Object.fromEntries(
  Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
);

/** POST /facilities: sport, name and capacity are required. */
const createFacilityBody = z.object({
  ...optional,
  sportId: fields.sportId,
  name: fields.name,
  capacity: fields.capacity,
});

/** PATCH /facilities/{facilityId}: any subset, but not nothing. */
const updateFacilityBody = z
  .object(optional)
  .refine((body) => Object.keys(body).length > 0, {
    error: 'Trimite cel puțin un câmp de modificat.',
  });

module.exports = {
  createFacilityBody,
  updateFacilityBody,
};
