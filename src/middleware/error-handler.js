const AppError = require('../errors/app-error');

function notFoundHandler(req, res) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Ruta nu există.' });
}

// Express recognises an error handler by its four parameters.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) {
      body.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ code: 'VALIDATION_ERROR', message: 'Corpul cererii nu e JSON.' });
    return;
  }
  console.error(err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'A apărut o eroare neașteptată. Încearcă din nou.',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
