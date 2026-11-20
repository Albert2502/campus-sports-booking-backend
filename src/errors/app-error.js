/**
 * An error the API answers with the `Error` body from openapi.yaml.
 */
class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code stable code from the `Error.code` enum
   * @param {string} message Romanian message shown to the user
   * @param {Object=} details
   */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = AppError;
