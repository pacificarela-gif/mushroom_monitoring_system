const nodemailer = require('nodemailer');

let transport = null;
let transportKey = '';

function smtpConfigured() {
  return Boolean((process.env.SMTP_URL || process.env.SMTP_HOST) && fromAddress());
}

function fromAddress() {
  // Brevo rejects a From that isn't a verified sender, so require it explicitly
  // instead of falling back to the SMTP login.
  return process.env.SMTP_FROM || '';
}

function getTransport() {
  const key = [
    process.env.SMTP_URL || '',
    process.env.SMTP_HOST || '',
    process.env.SMTP_PORT || '',
    process.env.SMTP_USER || '',
    process.env.SMTP_SECURE || '',
  ].join('|');
  if (transport && transportKey === key) return transport;
  transportKey = key;
  if (process.env.SMTP_URL) {
    transport = nodemailer.createTransport(process.env.SMTP_URL);
    return transport;
  }
  if (!process.env.SMTP_HOST) {
    transport = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === '1' || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined,
    connectionTimeout: 10 * 1000,
    greetingTimeout: 10 * 1000,
    socketTimeout: 20 * 1000,
  });
  return transport;
}

/**
 * Resolves a ready transport + From address, or null when SMTP is incomplete.
 * Shared by breach emails (which stay silent) and test emails (which surface
 * the error to the caller).
 */
function smtpReady() {
  const tx = getTransport();
  const from = fromAddress();
  if (!tx || !from) {
    console.warn('[email] SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM)');
    return null;
  }
  return { tx, from };
}

/**
 * One message per sustained breach. Returns false when SMTP or the
 * recipient is not configured so telemetry can continue.
 */
async function sendBreachEmail({ to, deviceId, message, durationMin, reading }) {
  const recipient = String(to || '').trim();
  if (!recipient || !recipient.includes('@')) return false;
  const conf = smtpReady();
  if (!conf) return false;
  const temp = typeof reading.tempC === 'number' ? `${reading.tempC.toFixed(1)}°C` : '—';
  const hum = typeof reading.humPct === 'number' ? `${Math.round(reading.humPct)}%` : '—';
  const co2 = typeof reading.co2ppm === 'number' ? `${Math.round(reading.co2ppm)} ppm` : '—';
  const text = [
    message,
    '',
    `This reading has stayed outside the target range for ${durationMin} minutes.`,
    `Device: ${deviceId}`,
    `Temperature: ${temp}`,
    `Humidity: ${hum}`,
    `CO₂: ${co2}`,
  ].join('\n');

  await conf.tx.sendMail({
    from: conf.from,
    to: recipient,
    subject: `Nursery alert: ${message}`,
    text,
  });
  return true;
}

/**
 * One-off confirmation email triggered from the app. Throws on failure so the
 * HTTP layer can return the SMTP error to the user.
 */
async function sendTestEmail({ to, deviceId }) {
  const recipient = String(to || '').trim();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('A valid recipient email is required.');
  }
  const conf = smtpReady();
  if (!conf) throw new Error('SMTP is not configured on the server.');
  const text = [
    'This is a test email from the Mushroom Nursery monitoring server.',
    '',
    `Device: ${deviceId}`,
    `Sent: ${new Date().toISOString()}`,
    '',
    'If you received this, breach alerts will be delivered to this address.',
  ].join('\n');

  await conf.tx.sendMail({
    from: conf.from,
    to: recipient,
    subject: 'Nursery email test',
    text,
  });
  return true;
}

module.exports = {
  smtpConfigured,
  sendBreachEmail,
  sendTestEmail,
};
