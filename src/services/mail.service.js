const nodemailer = require('nodemailer');

const env = require('../config/env');

let transport = null;

/**
 * The nodemailer transport, created on first use: in tests a JSON transport
 * that sends nothing (even when .env has SMTP settings), otherwise SMTP.
 * @return {import('nodemailer').Transporter}
 */
function getTransport() {
  if (transport) {
    return transport;
  }
  if (process.env.NODE_ENV === 'test') {
    transport = nodemailer.createTransport({ jsonTransport: true });
  } else if (env.mail.host) {
    transport = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: env.mail.user
        ? { user: env.mail.user, pass: env.mail.password }
        : undefined,
    });
  } else {
    throw new Error('SMTP_HOST is not set, so no email can be sent.');
  }
  return transport;
}

/**
 * Async, so a missing SMTP configuration rejects instead of throwing at the
 * caller.
 * @param {{to: string, subject: string, text: string}} message
 * @return {Promise<Object>} nodemailer's delivery info
 */
async function sendMail(message) {
  return getTransport().sendMail({ from: env.mail.from, ...message });
}

module.exports = {
  getTransport,
  sendMail,
};
