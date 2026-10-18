const nodemailer = require('nodemailer');

let transport = null;
let transportKey = '';

function smtpConfigured() {
  return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || '';
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
  });
  return transport;
}

/**
 * One message per sustained breach. Returns false when SMTP or the
 * recipient is not configured so telemetry can continue.
 */
async function sendBreachEmail({ to, deviceId, message, durationMin, reading }) {
  const recipient = String(to || '').trim();
  if (!recipient || !recipient.includes('@')) return false;
  const tx = getTransport();
  const from = fromAddress();
  if (!tx || !from) {
    console.warn('[email] SMTP is not configured (set SMTP_HOST and SMTP_FROM)');
    return false;
  }
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

  await tx.sendMail({
    from,
    to: recipient,
    subject: `Nursery alert: ${message}`,
    text,
  });
  return true;
}

module.exports = {
  smtpConfigured,
  sendBreachEmail,
};
