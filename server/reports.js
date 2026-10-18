const PDFDocument = require('pdfkit');

const ACTUATORS = [
  { key: 'fanOn', id: 'exhaust', label: 'Exhaust fan' },
  { key: 'intakeFanOn', id: 'intake', label: 'Intake fan' },
  { key: 'sprinklerOn', id: 'misting', label: 'Misting pump' },
  { key: 'heaterOn', id: 'heater', label: 'Heater' },
];

const METRICS = [
  { key: 'co2ppm', id: 'co2', label: 'CO₂', unit: 'ppm', digits: 0 },
  { key: 'humPct', id: 'humidity', label: 'Relative humidity', unit: '%', digits: 0 },
  { key: 'tempC', id: 'temperature', label: 'Temperature', unit: '°C', digits: 1 },
];

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function roundTo(v, digits) {
  if (v == null) return null;
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

/**
 * Actuator state recorded on a history point applies from that timestamp
 * until the next point (or the end of the window).
 */
function integrateFlag(flag, baseline, inside, fromMs, toMs) {
  let state = baseline ? !!baseline[flag] : false;
  let cursor = fromMs;
  let runtime = 0;
  if (!baseline && inside.length) {
    cursor = inside[0].tsMs;
    state = !!inside[0][flag];
  }
  for (const point of inside) {
    if (point.tsMs < cursor) continue;
    if (state) runtime += point.tsMs - cursor;
    cursor = point.tsMs;
    state = !!point[flag];
  }
  if (state && toMs > cursor) runtime += toMs - cursor;
  return Math.max(0, runtime);
}

function metricStats(points, field, digits) {
  const values = points.map((p) => num(p[field])).filter((v) => v != null);
  if (!values.length) return { min: null, max: null, avg: null, samples: 0 };
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return {
    min: roundTo(min, digits),
    max: roundTo(max, digits),
    avg: roundTo(sum / values.length, digits),
    samples: values.length,
  };
}

function collectEvents(alerts, events, fromMs, toMs) {
  const list = [];
  for (const event of events || []) {
    if (!event || typeof event.tsMs !== 'number') continue;
    if (event.tsMs < fromMs || event.tsMs > toMs) continue;
    list.push({
      tsMs: event.tsMs,
      kind: event.kind || 'anomaly',
      message: String(event.message || ''),
    });
  }
  const alertVals = alerts && typeof alerts === 'object' ? Object.values(alerts) : [];
  for (const alert of alertVals) {
    if (!alert || typeof alert.tsMs !== 'number') continue;
    if (alert.tsMs < fromMs || alert.tsMs > toMs) continue;
    if (String(alert.type || '').endsWith('_normal')) continue;
    list.push({
      tsMs: alert.tsMs,
      kind: 'warning',
      message: String(alert.body || alert.title || alert.type || 'Warning'),
    });
  }
  list.sort((a, b) => b.tsMs - a.tsMs);
  return list;
}

function buildDailyReport({ history, alerts, events, now = Date.now(), windowMs = 24 * 60 * 60 * 1000 }) {
  const toMs = now;
  const fromMs = now - windowMs;
  const sorted = (history || [])
    .filter((p) => p && typeof p.tsMs === 'number' && p.tsMs <= toMs)
    .slice()
    .sort((a, b) => a.tsMs - b.tsMs);

  let baseline = null;
  const inside = [];
  for (const point of sorted) {
    if (point.tsMs < fromMs) baseline = point;
    else inside.push(point);
  }

  const span = Math.max(1, toMs - fromMs);
  const metrics = {};
  for (const spec of METRICS) {
    metrics[spec.id] = {
      label: spec.label,
      unit: spec.unit,
      ...metricStats(inside, spec.key, spec.digits),
    };
  }

  const actuators = {};
  for (const spec of ACTUATORS) {
    const runtimeMs = integrateFlag(spec.key, baseline, inside, fromMs, toMs);
    actuators[spec.id] = {
      label: spec.label,
      runtimeMs,
      dutyCycle: runtimeMs / span,
    };
  }

  return {
    fromMs,
    toMs,
    windowMs,
    metrics,
    actuators,
    events: collectEvents(alerts, events, fromMs, toMs),
  };
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtIso(ms) {
  return new Date(ms).toISOString();
}

function reportToCsv(report, deviceId) {
  const lines = [];
  lines.push(['device_id', 'from', 'to'].join(','));
  lines.push([csvEscape(deviceId), fmtIso(report.fromMs), fmtIso(report.toMs)].join(','));
  lines.push('');
  lines.push(['metric', 'unit', 'min', 'max', 'average', 'samples'].join(','));
  for (const spec of METRICS) {
    const m = report.metrics[spec.id];
    lines.push([spec.id, spec.unit, m.min ?? '', m.max ?? '', m.avg ?? '', m.samples].join(','));
  }
  lines.push('');
  lines.push(['actuator', 'runtime_seconds', 'duty_cycle_pct'].join(','));
  for (const spec of ACTUATORS) {
    const a = report.actuators[spec.id];
    const seconds = Math.round(a.runtimeMs / 1000);
    const pct = Math.round(a.dutyCycle * 1000) / 10;
    lines.push([spec.id, seconds, pct].join(','));
  }
  lines.push('');
  lines.push(['timestamp', 'kind', 'message'].join(','));
  for (const event of report.events) {
    lines.push([fmtIso(event.tsMs), csvEscape(event.kind), csvEscape(event.message)].join(','));
  }
  return `${lines.join('\n')}\n`;
}

function formatRuntime(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function writeReportPdf(res, report, deviceId) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.info.Title = `Nursery daily report ${deviceId}`;
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#163027').text('Daily nursery report');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#444444');
  doc.text(`Device ${deviceId}`);
  doc.text(`${fmtIso(report.fromMs)}  →  ${fmtIso(report.toMs)}`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#163027').text('24-hour readings');
  doc.moveDown(0.4);
  for (const spec of METRICS) {
    const m = report.metrics[spec.id];
    const line =
      m.samples === 0
        ? `${spec.label}: no samples`
        : `${spec.label}: min ${m.min} ${spec.unit} · max ${m.max} ${spec.unit} · avg ${m.avg} ${spec.unit} (${m.samples} samples)`;
    doc.font('Helvetica').fontSize(11).fillColor('#222222').text(line);
  }

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#163027').text('Actuator runtime');
  doc.moveDown(0.4);
  for (const spec of ACTUATORS) {
    const a = report.actuators[spec.id];
    const pct = (a.dutyCycle * 100).toFixed(1);
    doc.font('Helvetica').fontSize(11).fillColor('#222222').text(
      `${spec.label}: ${formatRuntime(a.runtimeMs)} on · ${pct}% duty cycle`
    );
  }

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#163027').text('Event log');
  doc.moveDown(0.4);
  if (!report.events.length) {
    doc.font('Helvetica').fontSize(11).fillColor('#444444').text('No overrides, warnings, or sensor anomalies in this window.');
  } else {
    const shown = report.events.slice(0, 40);
    for (const event of shown) {
      const when = new Date(event.tsMs).toISOString().replace('T', ' ').slice(0, 16);
      doc.font('Helvetica').fontSize(10).fillColor('#222222').text(`${when}  [${event.kind}]  ${event.message}`, {
        width: 500,
      });
      doc.moveDown(0.15);
    }
    if (report.events.length > shown.length) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).fillColor('#666666').text(
        `${report.events.length - shown.length} older events omitted. Export CSV for the full log.`
      );
    }
  }

  doc.end();
}

module.exports = {
  buildDailyReport,
  reportToCsv,
  writeReportPdf,
  integrateFlag,
};
