export function parseTimestampToMs(ts) {
  if (!ts) return null;
  const m = ts.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d+)/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  d.setMilliseconds(Math.floor(+m[7] / 1000));
  return d.getTime();
}

export function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

export function compareLogData(dataA, dataB) {
  const procA = dataA?.processes?.[0];
  const procB = dataB?.processes?.[0];

  const stepsA = procA?.steps || [];
  const stepsB = procB?.steps || [];

  const allStepNames = [...new Set([...stepsA.map(s => s.name), ...stepsB.map(s => s.name)])];

  const stepDiffs = allStepNames.map(name => {
    const sa = stepsA.find(s => s.name === name);
    const sb = stepsB.find(s => s.name === name);

    const durationA = sa ? calcDuration(sa) : null;
    const durationB = sb ? calcDuration(sb) : null;

    let fasterFile = null;
    if (durationA != null && durationB != null) {
      fasterFile = durationA < durationB ? 'A' : durationA > durationB ? 'B' : 'equal';
    }

    return {
      name,
      stateA: sa?.state || null,
      stateB: sb?.state || null,
      durationA,
      durationB,
      deltaMs: durationA != null && durationB != null ? durationA - durationB : null,
      fasterFile,
    };
  });

  const totalA = calcProcessDuration(procA);
  const totalB = calcProcessDuration(procB);

  const errorsA = (dataA?.errors || []).map(e => e.message);
  const errorsB = (dataB?.errors || []).map(e => e.message);
  const setA = new Set(errorsA);
  const setB = new Set(errorsB);
  const onlyInA = errorsA.filter(e => !setB.has(e)).slice(0, 10);
  const onlyInB = errorsB.filter(e => !setA.has(e)).slice(0, 10);

  return {
    stepDiffs,
    overallDiff: {
      totalDurationA: totalA,
      totalDurationB: totalB,
      fasterFile: totalA != null && totalB != null ? (totalA < totalB ? 'A' : totalA > totalB ? 'B' : 'equal') : null,
    },
    imagingDiff: {
      totalSpotsA: procA?.imaging?.totalSpots ?? null,
      totalSpotsB: procB?.imaging?.totalSpots ?? null,
      obtainedA: procA?.imaging?.obtainedSpots ?? null,
      obtainedB: procB?.imaging?.obtainedSpots ?? null,
      avgMsA: procA?.imaging?.avgMs ?? null,
      avgMsB: procB?.imaging?.avgMs ?? null,
    },
    errorDiff: {
      countA: dataA?.errors?.length ?? 0,
      countB: dataB?.errors?.length ?? 0,
      onlyInA,
      onlyInB,
    },
  };
}

function calcDuration(step) {
  const start = parseTimestampToMs(step.startTime);
  const end = parseTimestampToMs(step.endTime);
  return start && end ? end - start : null;
}

function calcProcessDuration(proc) {
  if (!proc) return null;
  const start = parseTimestampToMs(proc.startTime);
  const end = parseTimestampToMs(proc.endTime);
  return start && end ? end - start : null;
}
