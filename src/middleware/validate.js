const AppError = require('../errors/app-error');

/**
 * Validates `req[source]` with a zod schema. The parsed value goes to
 * `req.valid[source]`, because Express 5 makes `req.query` read-only.
 * @param {import('zod').ZodType} schema
 * @param {'body'|'query'|'params'} source
 * @return {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      // One message per field, as in the BadRequest example of openapi.yaml.
      const fields = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || source;
        fields[field] ??= issue.message;
      }
      throw new AppError(400, 'VALIDATION_ERROR', 'Date invalide', { fields });
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}

module.exports = validate;
