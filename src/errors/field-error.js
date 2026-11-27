const AppError = require('./app-error');

/**
 * A 400 VALIDATION_ERROR about one field, in the `details.fields` shape.
 * @param {string} field
 * @param {string} message
 * @return {AppError}
 */
function fieldError(field, message) {
  return new AppError(400, 'VALIDATION_ERROR', 'Date invalide', {
    fields: { [field]: message },
  });
}

module.exports = fieldError;
