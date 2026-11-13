const AppError = require('../errors/app-error');

/**
 * Validates `req[source]` with a zod schema and replaces it with the parsed
 * value (Express 5 makes `req.query` read-only, so it goes to `req.valid`).
 * @param {import('zod').ZodType} schema
 * @param {'body'|'query'|'params'} source
 * @return {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Date invalide.', {
        fields,
      });
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}

module.exports = validate;
