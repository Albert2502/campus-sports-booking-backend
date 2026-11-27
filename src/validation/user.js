const z = require('zod');

const id = (message) =>
  z.coerce
    .number({ error: message })
    .int({ error: message })
    .positive({ error: message })
    // PostgreSQL integer.
    .max(2147483647, { error: message });

/** GET /users (admin): filters, search and the page. */
const listUsersQuery = z.object({
  role: z
    .enum(['student', 'teacher', 'admin'], {
      error: 'Rolul este student, teacher sau admin.',
    })
    .optional(),
  status: z
    .enum(['active', 'blocked'], { error: 'Starea este active sau blocked.' })
    .optional(),
  q: z
    .string()
    .trim()
    .max(100, { error: 'Căutarea are cel mult 100 de caractere.' })
    // An emptied search box means "no search".
    .transform((value) => value || undefined)
    .optional(),
  page: z.coerce
    .number({ error: 'Pagina este un număr.' })
    .int({ error: 'Pagina este un număr întreg.' })
    .min(1, { error: 'Pagina începe de la 1.' })
    .default(1),
  pageSize: z.coerce
    .number({ error: 'Mărimea paginii este un număr.' })
    .int({ error: 'Mărimea paginii este un număr întreg.' })
    .min(1, { error: 'Mărimea paginii este între 1 și 100.' })
    .max(100, { error: 'Mărimea paginii este între 1 și 100.' })
    .default(20),
});

const userParams = z.object({
  userId: id('Id-ul utilizatorului este un număr.'),
});

module.exports = {
  id,
  listUsersQuery,
  userParams,
};
