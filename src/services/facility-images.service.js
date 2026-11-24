const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const env = require('../config/env');
const AppError = require('../errors/app-error');
const fieldError = require('../errors/field-error');
const facilitiesRepository = require('../repositories/facilities.repository');
const imagesRepository = require('../repositories/facility-images.repository');

const MAX_IMAGES = 5;

/**
 * The image type from the file's first bytes; the name and the type the
 * browser sends are not trusted.
 * @param {Buffer} buffer
 * @return {?string} file extension, or null when it is not JPG or PNG
 */
function detectExtension(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'jpg';
  }
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    return 'png';
  }
  return null;
}

/**
 * The `FacilityImage` shape from openapi.yaml.
 * @param {import('sequelize').Model} image
 * @return {{id: number, url: string, position: number}}
 */
function toImage(image) {
  return {
    id: image.id,
    url: `/uploads/${image.path}`,
    position: image.position,
  };
}

/**
 * POST /facilities/{facilityId}/images (admin).
 * @param {number} facilityId
 * @param {{buffer: Buffer}} file from multer
 * @return {Promise<Object>} the `FacilityImage`
 */
async function addImage(facilityId, file) {
  if (!(await facilitiesRepository.findById(facilityId))) {
    throw new AppError(404, 'NOT_FOUND', 'Facilitatea nu există.');
  }
  const extension = detectExtension(file.buffer);
  if (!extension) {
    throw fieldError('image', 'Doar imagini JPG sau PNG.');
  }
  // Stored relative to UPLOADS_DIR; the database keeps this relative path.
  const relativePath = path.posix.join(
    'facilities',
    String(facilityId),
    `${crypto.randomBytes(16).toString('hex')}.${extension}`,
  );
  const absolutePath = path.join(env.uploadsDir, relativePath);
  try {
    const image = await imagesRepository.addWithinLimit(
      facilityId,
      MAX_IMAGES,
      async () => {
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, file.buffer);
        return relativePath;
      },
    );
    if (!image) {
      throw new AppError(
        422,
        'IMAGE_LIMIT_REACHED',
        `O facilitate are cel mult ${MAX_IMAGES} imagini. Șterge una ca să adaugi alta.`,
      );
    }
    return toImage(image);
  } catch (error) {
    // The row was not saved, so no file (even a half-written one) may stay.
    await fs.rm(absolutePath, { force: true }).catch((cleanupError) => {
      console.error(`Could not remove ${relativePath}:`, cleanupError.code);
    });
    throw error;
  }
}

/**
 * DELETE /facilities/{facilityId}/images/{imageId} (admin); the file goes too.
 * @param {number} facilityId
 * @param {number} imageId
 * @return {Promise<void>}
 */
async function deleteImage(facilityId, imageId) {
  const image = await imagesRepository.findOne(facilityId, imageId);
  if (!image) {
    throw new AppError(404, 'NOT_FOUND', 'Imaginea nu există.');
  }
  await imagesRepository.remove(imageId);
  // The row is what matters: a file that is missing or cannot be removed is
  // only logged, the image is gone for the API either way.
  await fs
    .rm(path.join(env.uploadsDir, image.path), { force: true })
    .catch((error) => {
      console.error(`Could not remove ${image.path}:`, error.code);
    });
}

module.exports = {
  toImage,
  addImage,
  deleteImage,
};
