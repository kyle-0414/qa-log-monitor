// Log line parsing patterns for AIDMAT logs
const PATTERNS = {
  timestamp: /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+\d+)\s+(\w+)\s+\[(.+?)\]\s+(.*)/,
  fwVersion: /AIDMAT version:\s*(.+)/,
  deviceId: /device id:\s*(.+)/,
  productModel: /Product Model:\s*(.+)/,
  serialNumber: /Serial Number:\s*(.+)/,
  lanIp: /LAN:\s*(.+)/,
  cerApp: /App loaded kr\.noul\.cer\s+.+?\s+([\d][\d.\-\w]+)/,
  cerAppReplaced: /App replaced kr\.noul\.cer\s+.+?->\s*([\d.\-\w]+)/,
  hawkVersion: /hawk version:\s*(.+)/i,
  sharkVersion: /shark version\s+(.+)/i,
  wolfVersion: /wolf version:\s*(.+)/i,
  pressCamVersion: /press camera version:\s*(.+)/,
  cerImagingPlugin: /loadMpeModelPlugins.*?kr\.noul\.cer\.task\.imaging.*?version=([\d.\-\w]+)/,
  cerSetupImagingPlugin: /loadMpeModelPlugins.*?kr\.noul\.cer\.task\.setup-imaging.*?version=([\d.\-\w]+)/,
  processStart: /Process started,\s*id=(\S+),\s*state=(\w+)/,
  processEnd: /\[(\S+)\]\s*ended,\s*state=(\w+)/,
  stepStart: /\[(\S+)\s+(\d+)\]\s*start/,
  stepDone: /\[(\S+)\]\s*done\s*:\s*(\w+)/,
  imagingResult: /Imaging result:\s*index=(\d+),x=(\d+),y=(\d+),slide x=([\d.-]+),slide y=([\d.-]+)/,
  logAfResult: /logAfResult.*?index=(\d+),x=(\d+),y=(\d+),af times=(\d+),last af level=(\d+),last af pos=(\d+),detection=(true|false)/,
  imagingInterval: /Updated variable:\s*imaging(Interval[XY])=(\d+)/,
  grabLoopStart: /Starting grab loop/,
  grabLoopEnd: /Ended grab loop.*?total=(\d+)ms.*?average=(\d+)ms.*?count=(\d+)/,
  hookPost: /Hook post reqBody=(.+)/,
  mcuStatus: /OperationMode.*Temperature:(\d+).*Humidity:(\d+).*ErrorInfo1:(0x\w+).*ErrorInfo2:(0x\w+).*FailStatus:(0x\w+).*BatteryStatus:(\w+).*BatteryRemainingCapacity:(0x\w+)/,
  totalSpots: /totalSpotCount[":]*(\d+)/,
  errorLine: /ERROR/i,
  warningLine: /WARNING/i,
};

// Main step names in process order
const MAIN_STEPS = [
  'waitCartridge', 'insert', 'stain', 'findPressPosition',
  'setupImaging', 'imaging', 'eject'
];

export function parseLine(line) {
  if (!line || line.trim() === '') return null;

  const tsMatch = line.match(PATTERNS.timestamp);
  const timestamp = tsMatch ? tsMatch[1] : null;
  const level = tsMatch ? tsMatch[2] : null;
  const source = tsMatch ? tsMatch[3] : null;
  const message = tsMatch ? tsMatch[4] : line;

  let m;

  // Device info
  if ((m = message.match(PATTERNS.fwVersion))) return { type: 'device-info', field: 'fwVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.deviceId))) return { type: 'device-info', field: 'deviceId', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.productModel))) return { type: 'device-info', field: 'productModel', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.serialNumber))) return { type: 'device-info', field: 'serialNumber', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.lanIp))) return { type: 'device-info', field: 'lanIp', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.cerApp))) return { type: 'device-info', field: 'cerVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.cerAppReplaced))) return { type: 'device-info', field: 'cerVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.hawkVersion))) return { type: 'device-info', field: 'hawkVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.sharkVersion))) return { type: 'device-info', field: 'sharkVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.wolfVersion))) return { type: 'device-info', field: 'wolfVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.pressCamVersion))) return { type: 'device-info', field: 'pressCamVersion', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.cerImagingPlugin))) return { type: 'device-info', field: 'cerImagingPlugin', value: m[1].trim(), timestamp };
  if ((m = message.match(PATTERNS.cerSetupImagingPlugin))) return { type: 'device-info', field: 'cerSetupImagingPlugin', value: m[1].trim(), timestamp };

  // Process lifecycle
  if ((m = message.match(PATTERNS.processStart))) return { type: 'process-start', processId: m[1], state: m[2], timestamp };
  if ((m = message.match(PATTERNS.processEnd))) return { type: 'process-end', processId: m[1], state: m[2], timestamp };

  // Step transitions
  if ((m = message.match(PATTERNS.stepStart))) {
    const stepName = m[1];
    const isMainStep = MAIN_STEPS.includes(stepName);
    return { type: 'step-start', step: stepName, id: m[2], isMainStep, timestamp };
  }
  if ((m = message.match(PATTERNS.stepDone))) {
    const stepName = m[1];
    const isMainStep = MAIN_STEPS.includes(stepName);
    return { type: 'step-done', step: stepName, result: m[2], isMainStep, timestamp };
  }

  // Imaging
  if ((m = message.match(PATTERNS.imagingResult))) return { type: 'imaging-progress', index: parseInt(m[1]), x: parseInt(m[2]), y: parseInt(m[3]), slideX: parseFloat(m[4]), slideY: parseFloat(m[5]), timestamp };
  if ((m = message.match(PATTERNS.logAfResult))) return { type: 'imaging-af', index: parseInt(m[1]), x: parseInt(m[2]), y: parseInt(m[3]), afTimes: parseInt(m[4]), afLevel: parseInt(m[5]), afPos: parseInt(m[6]), detection: m[7] === 'true', timestamp };
  if ((m = message.match(PATTERNS.imagingInterval))) return { type: 'imaging-interval', axis: m[1], value: parseInt(m[2]), timestamp };
  if (PATTERNS.grabLoopStart.test(message)) return { type: 'imaging-phase', event: 'start', timestamp };
  if ((m = message.match(PATTERNS.grabLoopEnd))) return { type: 'imaging-phase', event: 'end', totalMs: parseInt(m[1]), avgMs: parseInt(m[2]), count: parseInt(m[3]), timestamp };

  // Webhook with totalSpotCount
  if ((m = message.match(PATTERNS.hookPost))) {
    try {
      const body = JSON.parse(m[1]);
      const imagingTask = body.tasks?.find(t => t.name === 'imaging');
      if (imagingTask?.imaging) {
        return {
          type: 'imaging-meta',
          processId: body.id,
          totalSpotCount: imagingTask.imaging.totalSpotCount,
          obtainedSpotCount: imagingTask.imaging.obtainedSpotCount,
          remainingSpotCount: imagingTask.imaging.remainingSpotCount,
          timestamp
        };
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // MCU status
  if ((m = message.match(PATTERNS.mcuStatus))) {
    return {
      type: 'mcu-status',
      temperature: parseInt(m[1]),
      humidity: parseInt(m[2]),
      errorInfo1: m[3],
      errorInfo2: m[4],
      failStatus: m[5],
      batteryStatus: m[6],
      batteryCapacity: parseInt(m[7], 16),
      timestamp
    };
  }

  // Errors and warnings
  if (level === 'ERROR' || PATTERNS.errorLine.test(message)) {
    return { type: 'error', message: message.trim(), source, level, timestamp, raw: line };
  }

  if (level === 'WARN' || PATTERNS.warningLine.test(message)) {
    return { type: 'warning', message: message.trim(), source, level, timestamp };
  }

  return null;
}

export function parseFullLog(content) {
  const lines = content.split('\n');
  const deviceInfo = {};
  const processes = [];
  let currentProcess = null;
  let currentStepMap = new Map();
  let errors = [];
  let warnings = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    switch (parsed.type) {
      case 'device-info':
        deviceInfo[parsed.field] = parsed.value;
        break;
      case 'process-start':
        // Start tracking a new process
        currentProcess = {
          id: parsed.processId,
          startTime: parsed.timestamp,
          state: 'inProgress',
          steps: [],
          imaging: { totalSpots: 0, obtainedSpots: 0, avgMs: null, spots: [], imagingIntervalX: null, imagingIntervalY: null },
          errors: [],
          warnings: [],
        };
        currentStepMap = new Map();
        processes.push(currentProcess);
        break;
      case 'process-end': {
        // Find the matching process by id
        const proc = processes.find(p => p.id === parsed.processId) || currentProcess;
        if (proc) {
          proc.endTime = parsed.timestamp;
          proc.state = parsed.state;
        }
        break;
      }
      case 'step-start':
        if (parsed.isMainStep && currentProcess && !currentStepMap.has(parsed.step)) {
          const step = { name: parsed.step, startTime: parsed.timestamp, state: 'inProgress' };
          currentStepMap.set(parsed.step, step);
          currentProcess.steps.push(step);
        }
        break;
      case 'step-done':
        if (parsed.isMainStep && currentStepMap.has(parsed.step)) {
          const step = currentStepMap.get(parsed.step);
          step.endTime = parsed.timestamp;
          step.state = parsed.result;
        }
        break;
      case 'imaging-progress':
        if (currentProcess) {
          currentProcess.imaging.obtainedSpots = Math.max(currentProcess.imaging.obtainedSpots, parsed.index + 1);
          // Store spot with coordinates; detection/af will be merged from imaging-af
          const existingSpot = currentProcess.imaging.spots.find(s => s.index === parsed.index);
          if (existingSpot) {
            existingSpot.x = parsed.x;
            existingSpot.y = parsed.y;
            existingSpot.slideX = parsed.slideX;
            existingSpot.slideY = parsed.slideY;
            existingSpot.timestamp = parsed.timestamp;
          } else {
            currentProcess.imaging.spots.push({
              index: parsed.index, x: parsed.x, y: parsed.y,
              slideX: parsed.slideX, slideY: parsed.slideY,
              detection: null, afPos: null, timestamp: parsed.timestamp,
            });
          }
        }
        break;
      case 'imaging-af':
        if (currentProcess) {
          const afSpot = currentProcess.imaging.spots.find(s => s.index === parsed.index);
          if (afSpot) {
            afSpot.detection = parsed.detection;
            afSpot.afPos = parsed.afPos;
            afSpot.afTimes = parsed.afTimes;
          } else {
            currentProcess.imaging.spots.push({
              index: parsed.index, x: parsed.x, y: parsed.y,
              slideX: null, slideY: null,
              detection: parsed.detection, afPos: parsed.afPos,
              afTimes: parsed.afTimes, timestamp: parsed.timestamp,
            });
          }
        }
        break;
      case 'imaging-interval':
        if (currentProcess) {
          if (parsed.axis === 'IntervalX') currentProcess.imaging.imagingIntervalX = parsed.value;
          if (parsed.axis === 'IntervalY') currentProcess.imaging.imagingIntervalY = parsed.value;
        }
        break;
      case 'imaging-meta':
        if (currentProcess) {
          currentProcess.imaging.totalSpots = parsed.totalSpotCount || currentProcess.imaging.totalSpots;
        }
        break;
      case 'imaging-phase':
        if (parsed.event === 'end' && currentProcess) {
          currentProcess.imaging.avgMs = parsed.avgMs;
          currentProcess.imaging.obtainedSpots = Math.max(currentProcess.imaging.obtainedSpots, parsed.count);
        }
        break;
      case 'error': {
        const err = { message: parsed.message, source: parsed.source, timestamp: parsed.timestamp };
        errors.push(err);
        if (currentProcess) currentProcess.errors.push(err);
        break;
      }
      case 'warning': {
        const warn = { message: parsed.message, source: parsed.source, timestamp: parsed.timestamp };
        warnings.push(warn);
        if (currentProcess) currentProcess.warnings.push(warn);
        break;
      }
    }
  }

  // Backward compatibility: also expose single process/steps for existing consumers
  const firstProcess = processes[0] || null;
  return {
    deviceInfo,
    process: firstProcess ? { id: firstProcess.id, startTime: firstProcess.startTime, endTime: firstProcess.endTime, state: firstProcess.state } : null,
    steps: firstProcess ? firstProcess.steps : [],
    processes,
    imaging: firstProcess ? firstProcess.imaging : { totalSpots: 0, obtainedSpots: 0 },
    errors,
    warningCount: warnings.length,
  };
}

export { MAIN_STEPS };
