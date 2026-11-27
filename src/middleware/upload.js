const multer = require('multer');

const fieldError = require('../errors/field-error');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Kept in memory: the service checks the file before anything is written.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single('image');

/**
 * Reads one image from the multipart field `image` into `req.file`.
 * multer's errors become 400 VALIDATION_ERROR answers.
 */
function uploadImage(req, res, next) {
  parser(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      next(
        fieldError(
          'image',
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Imaginea are cel mult 5 MB.'
            : 'Trimite o singură imagine, în câmpul „image”.',
        ),
      );
      return;
    }
    if (error) {
      // busboy rejects a broken multipart body (cut off, bad headers) with a
      // plain Error: the request is at fault, not the server.
      next(
        fieldError('image', 'Fișierul nu a putut fi citit. Încearcă din nou.'),
      );
      return;
    }
    if (!req.file) {
      next(fieldError('image', 'Alege o imagine.'));
      return;
    }
    next();
  });
}

module.exports = {
  uploadImage,
};
