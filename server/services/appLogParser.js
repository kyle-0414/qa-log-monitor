/**
 * CER App Log Parser
 * 
 * App 로그에서 슬라이드 ID 완료 이벤트만 추출합니다.
 * 패턴: "Test {slideId} is finished, time: {ms}ms"
 */

const PATTERN_TEST_FINISH = /Test (\S+) is finished, time: (\d+)ms/;
const PATTERN_TIMESTAMP   = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/;

/**
 * App 로그 내용에서 슬라이드 완료 목록 추출
 * @param {string} content - grep 으로 필터된 로그 줄들
 * @returns {{ slideId, isoTimestamp, timestampMs, durationMs }[]}
 */
export function parseAppLogSlideIds(content) {
  const results = [];
  for (const line of content.split('\n')) {
    const tsMatch  = line.match(PATTERN_TIMESTAMP);
    const idMatch  = line.match(PATTERN_TEST_FINISH);
    if (tsMatch && idMatch) {
      const isoTimestamp = tsMatch[1];
      results.push({
        slideId:      idMatch[1],
        isoTimestamp,
        timestampMs:  new Date(isoTimestamp).getTime(),
        durationMs:   parseInt(idMatch[2]),
      });
    }
  }
  return results;
}

/**
 * SSW 프로세스 종료 시각과 App 로그 슬라이드 완료 시각을 매칭
 * App 로그의 "finished" 이벤트는 SSW 종료보다 약간 늦게 찍히므로
 * SSW endTime 이후 최대 WINDOW_MS 이내의 가장 가까운 항목을 찾습니다.
 *
 * @param {number} sswEndMs - SSW 프로세스 종료 시각 (ms)
 * @param {{ timestampMs, slideId }[]} appEntries - 정렬된 App 로그 항목
 * @param {number} windowMs - 허용 시간 범위 (기본 3분)
 * @returns {string|null} 매칭된 slideId
 */
export function matchSlideId(sswEndMs, appEntries, windowMs = 3 * 60 * 1000) {
  let best = null;
  let bestDiff = Infinity;

  for (const entry of appEntries) {
    // App 완료는 SSW 종료 이후에 찍히므로 entry.timestampMs >= sswEndMs 가 정상
    // 단, 약간의 시계 오차를 감안해 30초 이전도 허용
    const diff = entry.timestampMs - sswEndMs;
    if (diff >= -30_000 && diff <= windowMs) {
      const absDiff = Math.abs(diff);
      if (absDiff < bestDiff) {
        bestDiff = absDiff;
        best = entry.slideId;
      }
    }
  }
  return best;
}
