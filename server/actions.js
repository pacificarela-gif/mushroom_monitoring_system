/**
 * Action phrases shared by push alerts, breach email, and the daily log.
 * Wording follows the cultivation spec (dashboard examples).
 */

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function fmtCo2(v) {
  return `${Math.round(v)} ppm`;
}

function fmtTemp(v) {
  return `${v.toFixed(1)}°C`;
}

function fmtHum(v) {
  return `${Math.round(v)}%`;
}

function flags(reading, control) {
  const r = reading || {};
  const c = control || {};
  return {
    fanOn: !!r.fanOn,
    intakeOn: !!r.intakeFanOn,
    mistOn: !!r.sprinklerOn,
    heatOn: !!r.heaterOn,
    manualExhaust: !!c.manualOverride,
    manualIntake: !!c.manualIntakeFanOverride,
    manualMist: !!c.manualSprinklerOverride,
    manualHeat: !!c.manualHeaterOverride,
  };
}

/**
 * What the nursery is doing about one out-of-range reading.
 * @param {'co2'|'temp'|'hum'} metric
 * @param {'low'|'high'} direction
 */
function actionPhrase(metric, direction, reading, control) {
  const f = flags(reading, control);

  if (metric === 'co2' && direction === 'low') {
    if (f.manualExhaust) return 'Manual override blocking ventilation';
    if (f.fanOn) return 'Exhaust still running for temperature or humidity';
    return 'Ventilation exhaust paused, awaiting CO₂ accumulation';
  }
  if (metric === 'co2' && direction === 'high') {
    if (f.manualExhaust || f.manualIntake) return 'Manual override blocking automatic ventilation';
    if (f.fanOn || f.intakeOn) return 'Ventilation fans activated';
    return 'Ventilation requested';
  }
  if (metric === 'temp' && direction === 'high') {
    if (f.manualExhaust || f.manualIntake) return 'Manual override blocking cooling fans';
    if (f.fanOn || f.intakeOn) return 'Cooling fans activated';
    return 'Cooling fans requested';
  }
  if (metric === 'temp' && direction === 'low') {
    if (f.manualHeat) return 'Manual override blocking heater';
    if (f.heatOn) return 'Heater engaged';
    return 'Heater idle, awaiting temperature recovery';
  }
  if (metric === 'hum' && direction === 'low') {
    if (f.manualMist) return 'Manual override blocking misting';
    if (f.mistOn) return 'Misting system engaged';
    return 'Misting system idle (cooldown or disabled)';
  }
  if (metric === 'hum' && direction === 'high') {
    if (f.manualExhaust) return 'Manual override blocking exhaust';
    if (f.fanOn) return 'Exhaust fan activated to lower humidity';
    return 'Exhaust requested to lower humidity';
  }
  return 'Monitoring';
}

const TITLES = {
  co2: 'CO₂',
  temp: 'Temperature',
  hum: 'Humidity',
};

function formatValue(metric, value) {
  if (metric === 'co2') return fmtCo2(value);
  if (metric === 'temp') return fmtTemp(value);
  return fmtHum(value);
}

/**
 * Spec form: `Temperature High: 28.1°C (Action: Cooling fans activated)`
 */
function breachMessage(metric, direction, value, reading, control) {
  const title = TITLES[metric] || metric;
  const side = direction === 'low' ? 'Low' : 'High';
  const action = actionPhrase(metric, direction, reading, control);
  return `${title} ${side}: ${formatValue(metric, value)} (Action: ${action})`;
}

/**
 * Readings outside the saved target range.
 * CO₂ at or below 0 is treated as "sensor not ready", not a low-CO₂ breach.
 */
function listBreaches(reading, control) {
  const r = reading || {};
  const c = control || {};
  const out = [];
  const co2 = num(r.co2ppm);
  const temp = num(r.tempC);
  const hum = num(r.humPct);
  const co2Max = num(c.co2ThresholdPpm);
  const co2Min = num(c.co2MinPpm);
  const tempMax = num(c.tempFanOnC);
  const tempMin = num(c.tempMinC);
  const humMax = num(c.humFanOnPct);
  const humMin = num(c.humMinPct);

  if (co2Max != null && co2 != null && co2 > 0 && co2 >= co2Max) {
    out.push({ metric: 'co2', direction: 'high', value: co2, threshold: co2Max });
  } else if (co2Min != null && co2 != null && co2 > 0 && co2 <= co2Min) {
    out.push({ metric: 'co2', direction: 'low', value: co2, threshold: co2Min });
  }

  if (tempMax != null && temp != null && temp >= tempMax) {
    out.push({ metric: 'temp', direction: 'high', value: temp, threshold: tempMax });
  } else if (tempMin != null && temp != null && temp <= tempMin) {
    out.push({ metric: 'temp', direction: 'low', value: temp, threshold: tempMin });
  }

  if (humMax != null && hum != null && hum >= humMax) {
    out.push({ metric: 'hum', direction: 'high', value: hum, threshold: humMax });
  } else if (humMin != null && hum != null && hum <= humMin) {
    out.push({ metric: 'hum', direction: 'low', value: hum, threshold: humMin });
  }

  return out;
}

/** True when a metric is outside its band. Used to clear a sustained breach. */
function isOutOfBand(metric, reading, control) {
  return listBreaches(reading, control).some((b) => b.metric === metric);
}

module.exports = {
  actionPhrase,
  breachMessage,
  listBreaches,
  isOutOfBand,
  formatValue,
};
