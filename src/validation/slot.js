const z = require('zod');

// Keeps one request within the "under 500 ms" goal of CB-15.
const MAX_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

const id = (message) =>
  z.coerce
    .number({ error: message })
    .int({ error: message })
    .positive({ error: message })
    // PostgreSQL integer.
    .max(2147483647, { error: message });

const hourMinute = (message) =>
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: message });

const dateTime = (message) =>
  z.iso.datetime({ offset: true, error: message }).transform((value) => {
    return new Date(value);
  });

/** GET /slots: a day (`date`) or an interval (`from` + `to`), plus filters. */
const listSlotsQuery = z
  .object({
    facilityId: id('Id-ul facilității este un număr.').optional(),
    sportId: id('Id-ul sportului este un număr.').optional(),
    date: z.iso.date({ error: 'Data are forma AAAA-LL-ZZ.' }).optional(),
    from: dateTime('Începutul intervalului este o dată cu oră.').optional(),
    to: dateTime('Sfârșitul intervalului este o dată cu oră.').optional(),
    fromTime: hourMinute('Ora de început are forma HH:mm.').optional(),
    toTime: hourMinute('Ora de sfârșit are forma HH:mm.').optional(),
    available: z
      .enum(['true', 'false'], { error: 'available este true sau false.' })
      .transform((value) => value === 'true')
      .optional(),
  })
  .superRefine((query, ctx) => {
    const issue = (path, message) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (query.date && (query.from || query.to)) {
      issue('date', 'Alege fie o zi, fie un interval (from și to).');
    } else if (Boolean(query.from) !== Boolean(query.to)) {
      issue(query.from ? 'to' : 'from', 'Intervalul are nevoie de from și to.');
    } else if (query.from && query.to <= query.from) {
      issue('to', 'Sfârșitul intervalului este după început.');
    } else if (query.from && query.to - query.from > MAX_RANGE_DAYS * DAY_MS) {
      issue('to', `Intervalul are cel mult ${MAX_RANGE_DAYS} de zile.`);
    }
    // 'HH:mm' strings compare in time order.
    if (query.fromTime && query.toTime && query.toTime <= query.fromTime) {
      issue('toTime', 'Ora de sfârșit este după ora de început.');
    }
  });

const slotParams = z.object({
  slotId: id('Id-ul slotului este un număr.'),
});

module.exports = {
  listSlotsQuery,
  slotParams,
};
