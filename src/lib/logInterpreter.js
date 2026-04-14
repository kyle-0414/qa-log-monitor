/**
 * AIDMAT 로그 해석기
 * 로그 라인 또는 파싱된 이벤트를 받아 한국어 설명을 반환합니다.
 */

// ─── 단계별 설명 ───────────────────────────────────────────────────────────────
export const STEP_DESCRIPTIONS = {
  waitCartridge: {
    title: '카트리지 대기',
    summary: '카트리지가 삽입되기를 기다리고 있어요.',
    detail: '디바이스가 준비 상태로 카트리지 삽입을 감지하고 있습니다. 카트리지를 올바른 방향으로 삽입하면 자동으로 다음 단계로 넘어가요.',
    icon: '🕐',
    tips: ['카트리지가 끝까지 밀어 넣어졌는지 확인하세요', '카트리지 방향이 올바른지 확인하세요'],
  },
  insert: {
    title: '카트리지 삽입',
    summary: '카트리지를 인식하고 초기 상태를 확인하는 중이에요.',
    detail: '삽입된 카트리지의 바코드 또는 ID를 읽고, 내부 메커니즘으로 카트리지를 고정합니다. 이 단계에서 카트리지 상태 이상이 감지되면 테스트가 중단될 수 있어요.',
    icon: '📥',
    tips: ['정상이면 수 초 내에 완료돼요'],
  },
  stain: {
    title: '염색(Stain)',
    summary: '카트리지 내부에 염색 시약을 주입하고 반응시키는 중이에요.',
    detail: '검체와 시약이 반응하는 가장 긴 단계입니다. 온도·습도 조건을 유지하며 시약이 검체에 충분히 결합하도록 기다립니다. 이 단계는 보통 20~40분 소요되며 기다리면 자동으로 진행돼요.',
    icon: '🧪',
    tips: ['정상 소요 시간: 20~40분', '이 단계에서 디바이스를 건드리지 마세요', 'MCU 온도·습도가 정상 범위인지 확인하세요'],
  },
  findPressPosition: {
    title: '압착 위치 탐색',
    summary: '슬라이드를 정확히 압착할 위치를 자동으로 찾는 중이에요.',
    detail: '카메라로 슬라이드 표면을 스캔하여 압착 기준점을 계산합니다. 이 과정이 실패하면 이미징 위치가 어긋날 수 있어요.',
    icon: '🎯',
    tips: ['정상이면 1~3분 내 완료', '실패 시 슬라이드 표면 이물질 확인 필요'],
  },
  setupImaging: {
    title: '이미징 준비',
    summary: '이미지를 촬영하기 위한 카메라 및 광학계를 초기화하는 중이에요.',
    detail: '카메라 노출값 조정, 조명 설정, Hawk/Shark 카메라 연결 확인, 초기 AF(자동초점) 캘리브레이션을 수행합니다. 이 단계가 완료돼야 실제 이미지 촬영이 시작돼요.',
    icon: '⚙️',
    tips: ['정상이면 1~5분 내 완료', 'Hawk/Shark 연결 오류가 있다면 이 단계에서 실패해요'],
  },
  imaging: {
    title: '이미징 (이미지 촬영)',
    summary: '슬라이드의 각 spot을 순서대로 촬영하고 있어요.',
    detail: '그리드 형태로 배열된 모든 spot을 하나씩 이동하며 촬영합니다. 각 spot마다 AF(자동초점) 조정 → 이미지 촬영 → 검출 결과 저장 순서로 진행됩니다. 취득한 이미지 수 / 전체 수가 진행률이에요.',
    icon: '📷',
    tips: ['진행률이 멈추면 AF 문제일 수 있어요', '평균 취득 시간보다 크게 느리면 광학계 이상 가능'],
  },
  eject: {
    title: '배출(Eject)',
    summary: '테스트가 완료되어 카트리지를 배출하는 중이에요.',
    detail: '모든 이미지 촬영과 결과 분석이 끝난 후 카트리지를 배출 위치로 이동시킵니다. 배출이 완료되면 카트리지를 꺼낼 수 있어요.',
    icon: '📤',
    tips: ['배출 후 카트리지를 바로 꺼내세요', '배출이 안 되면 수동 배출을 시도하세요'],
  },
};

// ─── 로그 라인 해석 함수 ────────────────────────────────────────────────────────
export function interpretLogLine(line) {
  if (!line || !line.trim()) return null;

  const result = {
    level: 'info',   // 'info' | 'warning' | 'error' | 'success'
    title: '',
    summary: '',
    detail: '',
    tags: [],
  };

  // 타임스탬프/레벨/소스 파싱
  const tsMatch = line.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+\d+\s+(\w+)\s+\[(.+?)\]\s+(.*)/);
  const level  = tsMatch ? tsMatch[2] : '';
  const source = tsMatch ? tsMatch[3] : '';
  const msg    = tsMatch ? tsMatch[4] : line;

  // ── 프로세스 시작/종료 ──
  let m;
  if ((m = msg.match(/Process started,\s*id=(\S+)/))) {
    return { level: 'info', title: '🚀 테스트 시작', tags: ['프로세스'],
      summary: `새 테스트가 시작됐어요.`,
      detail: `테스트 ID: ${m[1]}\n모든 단계가 순서대로 진행될 예정이에요.` };
  }
  if ((m = msg.match(/\[(\S+)\]\s*ended,\s*state=(\w+)/))) {
    const ok = m[2] === 'success';
    return {
      level: ok ? 'success' : 'error',
      title: ok ? '✅ 테스트 완료' : '❌ 테스트 실패',
      tags: ['프로세스'],
      summary: ok ? '테스트가 성공적으로 완료됐어요.' : `테스트가 실패로 종료됐어요. (state: ${m[2]})`,
      detail: ok
        ? '결과 데이터가 서버로 전송되고 카트리지 배출이 진행됩니다.'
        : '에러 로그를 확인하여 실패 원인을 파악해 주세요.',
    };
  }

  // ── 단계 시작 ──
  const STEP_NAMES = ['waitCartridge','insert','stain','findPressPosition','setupImaging','imaging','eject'];
  if ((m = msg.match(/\[(\S+)\s+\d+\]\s*start/))) {
    const stepName = m[1];
    if (STEP_NAMES.includes(stepName)) {
      const desc = STEP_DESCRIPTIONS[stepName];
      return {
        level: 'info', title: `▶️ ${desc?.title || stepName} 시작`, tags: ['단계 전환'],
        summary: desc?.summary || `${stepName} 단계가 시작됐어요.`,
        detail: desc?.detail || '',
      };
    }
    return { level: 'info', title: `▶️ 서브태스크 시작: ${stepName}`, tags: ['내부 동작'],
      summary: `내부 작업 "${stepName}"이 시작됐어요.`,
      detail: '디바이스 내부 동작으로 사용자 조작이 필요하지 않아요.' };
  }

  // ── 단계 완료 ──
  if ((m = msg.match(/\[(\S+)\]\s*done\s*:\s*(\w+)/))) {
    const stepName = m[1];
    const state    = m[2];
    const ok       = state === 'success';
    if (STEP_NAMES.includes(stepName)) {
      return {
        level: ok ? 'success' : 'error',
        title: ok ? `✅ ${STEP_DESCRIPTIONS[stepName]?.title || stepName} 완료` : `❌ ${stepName} 실패`,
        tags: ['단계 전환'],
        summary: ok ? `${stepName} 단계가 성공적으로 완료됐어요.` : `${stepName} 단계가 실패했어요. (${state})`,
        detail: ok ? '다음 단계로 자동 진행됩니다.' : '에러 로그를 확인하고 디바이스 상태를 점검하세요.',
      };
    }
  }

  // ── 이미징 결과 ──
  if ((m = msg.match(/Imaging result:\s*index=(\d+),x=(\d+),y=(\d+)/))) {
    const idx = m[1];
    return { level: 'info', title: `📷 Spot #${idx} 촬영 완료`, tags: ['이미징'],
      summary: `${idx}번 spot의 이미지를 취득했어요. (격자 위치 X:${m[2]}, Y:${m[3]})`,
      detail: 'AF(자동초점) 결과와 검출 여부는 바로 다음 로그에서 확인할 수 있어요.' };
  }

  // ── AF 결과 ──
  if ((m = msg.match(/logAfResult.*?index=(\d+).*?af times=(\d+).*?detection=(true|false)/))) {
    const idx       = m[1];
    const afTimes   = parseInt(m[2]);
    const detected  = m[3] === 'true';
    const afRetried = afTimes >= 2;
    return {
      level: !detected ? 'warning' : afRetried ? 'warning' : 'success',
      title: `🔍 Spot #${idx} 분석 결과`,
      tags: ['이미징', 'AF', '검출'],
      summary: detected
        ? `검체 감지 ✓ (AF ${afTimes}회 시도)`
        : `검체 미감지 (AF ${afTimes}회 시도)`,
      detail: !detected
        ? `해당 위치(spot #${idx})에서 검체가 검출되지 않았어요.\n${afRetried ? `⚠️ AF를 ${afTimes}번이나 시도했어요 — 슬라이드 표면 또는 광학계 이상일 수 있어요.` : ''}`
        : afRetried
          ? `검체는 감지됐지만 AF를 ${afTimes}번 시도해야 했어요.\n광학계 상태를 주기적으로 점검하는 것을 권장해요.`
          : `정상적으로 검체를 감지했어요.`,
    };
  }

  // ── Grab Loop 시작/종료 ──
  if (/Starting grab loop/.test(msg)) {
    return { level: 'info', title: '📡 이미징 루프 시작', tags: ['이미징'],
      summary: '모든 spot에 대한 순차 촬영을 시작해요.',
      detail: 'Grab loop가 시작되면 설정된 전체 spot 수만큼 이미지를 순서대로 취득합니다.' };
  }
  if ((m = msg.match(/Ended grab loop.*?total=(\d+)ms.*?average=(\d+)ms.*?count=(\d+)/))) {
    return { level: 'success', title: '✅ 이미징 루프 완료', tags: ['이미징'],
      summary: `총 ${m[3]}개 spot 촬영 완료. 평균 취득 시간 ${m[2]}ms`,
      detail: `전체 소요: ${Math.round(parseInt(m[1])/1000)}초\n평균 간격: ${m[2]}ms/장\n총 취득: ${m[3]}장` };
  }

  // ── Webhook (결과 전송) ──
  if (/Hook post reqBody/.test(msg)) {
    return { level: 'info', title: '📤 결과 서버 전송', tags: ['통신'],
      summary: '테스트 결과 데이터를 서버(CER)로 전송했어요.',
      detail: 'totalSpotCount, obtainedSpotCount 등 이미징 결과가 포함돼요.' };
  }

  // ── 버전 정보 ──
  if ((m = msg.match(/App loaded kr\.noul\.cer/))) {
    return { level: 'info', title: '🚀 CER 앱 로드', tags: ['시스템'],
      summary: 'CER 애플리케이션이 시작됐어요.',
      detail: 'AIDMAT 디바이스의 메인 소프트웨어가 초기화되고 있어요.' };
  }
  if ((m = msg.match(/AIDMAT version:\s*(.+)/))) {
    return { level: 'info', title: '🔧 펌웨어 버전 확인', tags: ['시스템'],
      summary: `System SW 버전: ${m[1].trim()}`,
      detail: '디바이스 펌웨어가 로드됐어요.' };
  }
  if ((m = msg.match(/hawk version:\s*(.+)/i))) {
    return { level: 'info', title: '📷 Hawk 카메라 연결', tags: ['카메라'],
      summary: `Hawk 버전: ${m[1].trim()}`,
      detail: 'Hawk 카메라 모듈이 정상적으로 연결됐어요.' };
  }
  if ((m = msg.match(/shark version\s+(.+)/i))) {
    return { level: 'info', title: '📷 Shark 카메라 연결', tags: ['카메라'],
      summary: `Shark 버전: ${m[1].trim()}`,
      detail: 'Shark 카메라 모듈이 정상적으로 연결됐어요.' };
  }

  // ── MCU 상태 ──
  if (/OperationMode.*Temperature/.test(msg)) {
    const temp = msg.match(/Temperature:(\d+)/)?.[1];
    const humi = msg.match(/Humidity:(\d+)/)?.[1];
    const fail = msg.match(/FailStatus:(0x\w+)/)?.[1];
    const failOk = !fail || fail === '0x00' || fail === '0x0';
    return {
      level: failOk ? 'info' : 'error',
      title: `🌡️ MCU 상태 보고`,
      tags: ['MCU', '하드웨어'],
      summary: `온도 ${temp}°C, 습도 ${humi}% ${failOk ? '— 정상' : `— ⚠️ FailStatus: ${fail}`}`,
      detail: failOk
        ? '디바이스 환경이 정상 범위 내에 있어요.'
        : `FailStatus ${fail}은 하드웨어 이상을 나타냅니다. 디바이스를 점검하세요.\n0x01: 압력 이상 / 0x02: 온도 이상 / 0x04: 모터 이상`,
    };
  }

  // ── Imaging Interval ──
  if ((m = msg.match(/Updated variable:\s*imaging(Interval[XY])=(\d+)/))) {
    return { level: 'info', title: '📐 이미징 간격 설정', tags: ['이미징'],
      summary: `${m[1]} = ${m[2]} (spot 간 이동 거리)`,
      detail: '슬라이드 내 spot 간 이동 간격이 설정됐어요. 슬라이드 종류에 따라 달라집니다.' };
  }

  // ── 에러 패턴 ──
  if (level === 'ERROR' || /ERROR/i.test(msg)) {
    const interp = interpretError(msg);
    return { level: 'error', title: '🔴 에러 발생', tags: ['에러'], ...interp };
  }

  // ── 경고 패턴 ──
  if (level === 'WARN' || /WARNING/i.test(msg)) {
    return { level: 'warning', title: '⚠️ 경고', tags: ['경고'],
      summary: '주의가 필요한 상황이에요.',
      detail: `소스: [${source}]\n내용: ${msg.substring(0, 200)}` };
  }

  return null;  // 알 수 없는 라인
}

// ─── 에러 해석 ──────────────────────────────────────────────────────────────────
function interpretError(msg) {
  let m;

  if ((m = msg.match(/FailStatus[:\s]*(0x\w+)/i))) {
    const code  = m[1].toLowerCase();
    const codes = {
      '0x01': '압력 센서 이상 — 카트리지 압착 상태를 확인하세요',
      '0x02': '온도 이상 — 디바이스 주변 온도를 확인하세요',
      '0x04': '모터/구동계 이상 — 카트리지 걸림 여부를 확인하세요',
      '0x08': '배터리 이상 — 전원 연결 상태를 확인하세요',
      '0x10': '카메라 연결 이상 — Hawk/Shark 연결을 확인하세요',
    };
    const known = Object.entries(codes).find(([k]) => parseInt(code, 16) & parseInt(k, 16));
    return {
      summary: `하드웨어 오류 코드: ${m[1]}`,
      detail: known ? known[1] : `알 수 없는 오류 코드예요. 디바이스를 재시작하거나 담당자에게 문의하세요.`,
    };
  }

  if (/ssh|connection refused|timeout/i.test(msg)) {
    return { summary: 'SSH 연결 문제', detail: '디바이스와의 네트워크 연결이 끊어졌어요. IP와 포트를 확인하세요.' };
  }
  if (/OutOfMemory|out of memory/i.test(msg)) {
    return { summary: '메모리 부족', detail: '디바이스 메모리가 부족해요. 다른 앱을 종료하거나 재시작하세요.' };
  }
  if (/NullPointer|null pointer/i.test(msg)) {
    return { summary: '소프트웨어 내부 오류', detail: '예상치 못한 내부 오류예요. 이 오류가 반복되면 FW 버전을 확인하세요.' };
  }
  if (/af.*fail|focus.*fail/i.test(msg)) {
    return { summary: 'AF(자동초점) 실패', detail: '렌즈 오염, 슬라이드 표면 이상, 또는 카메라 이상일 수 있어요.' };
  }
  if (/cartridge|카트리지/i.test(msg)) {
    return { summary: '카트리지 관련 오류', detail: '카트리지가 올바르게 삽입됐는지, 손상되지 않았는지 확인하세요.' };
  }
  if (/timeout/i.test(msg)) {
    return { summary: '타임아웃 — 응답 없음', detail: '디바이스 또는 서버가 지정된 시간 내에 응답하지 않았어요.' };
  }

  return {
    summary: '알 수 없는 에러',
    detail: `에러 내용: ${msg.substring(0, 200)}\n\n이 에러가 반복되면 로그 전체를 담당자에게 공유해 주세요.`,
  };
}

// ─── 레벨 색상 ──────────────────────────────────────────────────────────────────
export const LEVEL_COLORS = {
  info:    'var(--text-secondary)',
  success: 'var(--green)',
  warning: 'var(--yellow)',
  error:   'var(--red)',
};

export const LEVEL_BG = {
  info:    'rgba(99,102,241,0.08)',
  success: 'rgba(16,185,129,0.1)',
  warning: 'rgba(245,158,11,0.1)',
  error:   'rgba(239,68,68,0.1)',
};
