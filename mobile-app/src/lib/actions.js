import { FEATURES } from './features';

/**
 * Dashboard copy. Keep the breach sentences aligned with server/actions.js
 * so the phone, push alerts, and email say the same thing.
 */

function actionPhrase(metric, direction, reading, control) {
  const fanOn = !!reading.fanOn;
  const intakeOn = !!reading.intakeFanOn;
  const mistOn = !!reading.sprinklerOn;
  const heatOn = !!reading.heaterOn;
  const manualExhaust = !!control.manualOverride;
  const manualIntake = !!control.manualIntakeFanOverride;
  const manualMist = !!control.manualSprinklerOverride;
  const manualHeat = !!control.manualHeaterOverride;

  if (metric === 'co2' && direction === 'low') {
    if (manualExhaust) return 'Manual override blocking ventilation';
    if (fanOn) return 'Exhaust still running for temperature or humidity';
    return 'Ventilation exhaust paused, awaiting CO₂ accumulation';
  }
  if (metric === 'co2' && direction === 'high') {
    if (manualExhaust || manualIntake) return 'Manual override blocking automatic ventilation';
    if (fanOn || intakeOn) return 'Ventilation fans activated';
    return 'Ventilation requested';
  }
  if (metric === 'temp' && direction === 'high') {
    if (manualExhaust || manualIntake) return 'Manual override blocking cooling fans';
    if (fanOn || intakeOn) return 'Cooling fans activated';
    return 'Cooling fans requested';
  }
  if (metric === 'temp' && direction === 'low') {
    if (manualHeat) return 'Manual override blocking heater';
    if (heatOn) return 'Heater engaged';
    return 'Heater idle, awaiting temperature recovery';
  }
  if (metric === 'hum' && direction === 'low') {
    if (manualMist) return 'Manual override blocking misting';
    if (mistOn) return 'Misting system engaged';
    return 'Misting system idle (cooldown or disabled)';
  }
  if (metric === 'hum' && direction === 'high') {
    if (manualExhaust) return 'Manual override blocking exhaust';
    if (fanOn) return 'Exhaust fan activated to lower humidity';
    return 'Exhaust requested to lower humidity';
  }
  return 'Monitoring';
}

function formatValue(metric, value) {
  if (metric === 'co2') return `${Math.round(value)} ppm`;
  if (metric === 'temp') return `${value.toFixed(1)}°C`;
  return `${Math.round(value)}%`;
}

export function breachMessage(metric, direction, value, reading, control) {
  const title = metric === 'co2' ? 'CO₂' : metric === 'temp' ? 'Temperature' : 'Humidity';
  const side = direction === 'low' ? 'Low' : 'High';
  const action = actionPhrase(metric, direction, reading, control);
  return `${title} ${side}: ${formatValue(metric, value)} (Action: ${action})`;
}

function directionFor(value, lo, hi) {
  if (hi != null && value >= hi) return 'high';
  return 'low';
}

function co2Card(input) {
  if (input.manualOverride || input.manualIntakeFanOverride) {
    return { manual: true, action: 'Manual override' };
  }
  if (input.fanOn && input.intakeFanOn) return { manual: false, action: 'Fans On' };
  if (input.fanOn) return { manual: false, action: 'Exhaust On' };
  if (input.intakeFanOn) return { manual: false, action: 'Intake On' };
  return { manual: false, action: 'Exhaust idle' };
}

function humidityCard(input) {
  const high = input.humStatus === 'bad' && input.humHi != null && input.humPct != null && input.humPct >= input.humHi;
  if (high) {
    if (input.manualOverride) return { manual: true, action: 'Manual override' };
    if (input.fanOn) return { manual: false, action: 'Exhaust On' };
    return { manual: false, action: 'Exhaust idle' };
  }
  if (input.manualSprinklerOverride) return { manual: true, action: 'Manual override' };
  if (input.sprinklerOn) return { manual: false, action: 'Misting On' };
  return { manual: false, action: 'Misting idle' };
}

function temperatureCard(input) {
  if (input.manualOverride || input.manualIntakeFanOverride || input.manualHeaterOverride) {
    return { manual: true, action: 'Manual override' };
  }
  if (input.heaterOn) return { manual: false, action: 'Heater On' };
  if (input.fanOn || input.intakeFanOn) return { manual: false, action: 'Cooling fans On' };
  return { manual: false, action: 'Fans idle' };
}

export function describeDashboard(input) {
  const reading = {
    fanOn: input.fanOn,
    intakeFanOn: input.intakeFanOn,
    sprinklerOn: input.sprinklerOn,
    heaterOn: input.heaterOn,
  };
  const control = {
    manualOverride: input.manualOverride,
    manualIntakeFanOverride: input.manualIntakeFanOverride,
    manualSprinklerOverride: input.manualSprinklerOverride,
    manualHeaterOverride: input.manualHeaterOverride,
  };

  const lines = [];
  if (input.co2Status === 'bad' && input.co2ppm != null) {
    lines.push(breachMessage('co2', directionFor(input.co2ppm, input.co2Lo, input.co2Hi), input.co2ppm, reading, control));
  }
  if (input.humStatus === 'bad' && input.humPct != null) {
    lines.push(breachMessage('hum', directionFor(input.humPct, input.humLo, input.humHi), input.humPct, reading, control));
  }
  if (input.tempStatus === 'bad' && input.tempC != null) {
    lines.push(breachMessage('temp', directionFor(input.tempC, input.tempLo, input.tempHi), input.tempC, reading, control));
  }

  const overridden = [];
  if (input.manualOverride) overridden.push(input.manualFanOn ? 'Exhaust forced ON' : 'Exhaust forced OFF');
  if (input.manualIntakeFanOverride) overridden.push(input.manualIntakeFanOn ? 'Intake forced ON' : 'Intake forced OFF');
  if (input.manualSprinklerOverride) overridden.push(input.manualSprinklerOn ? 'Misting forced ON' : 'Misting forced OFF');
  if (input.manualHeaterOverride) overridden.push(input.manualHeaterOn ? 'Heater forced ON' : 'Heater forced OFF');

  const interventions = [];
  interventions.push(input.fanOn ? 'Exhaust On' : 'Exhaust idle');
  interventions.push(input.intakeFanOn ? 'Intake On' : 'Intake idle');
  interventions.push(input.sprinklerOn ? 'Misting On' : 'Misting idle');
  if (FEATURES.heater || input.heaterOn || input.manualHeaterOverride) {
    interventions.push(input.heaterOn ? 'Heater On' : 'Heater idle');
  }

  return {
    lines,
    cards: {
      co2: co2Card(input),
      humidity: humidityCard(input),
      temperature: temperatureCard(input),
    },
    anyManual: overridden.length > 0,
    overridden,
    interventions,
  };
}
