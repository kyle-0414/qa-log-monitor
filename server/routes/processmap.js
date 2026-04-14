import { Router } from 'express';
import { execCommand } from '../services/sshPool.js';
import config from '../config.js';

const router = Router();

function parseConcatJson(str) {
  const results = [];
  let depth = 0, start = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { results.push(JSON.parse(str.substring(start, i + 1))); } catch {}
        start = -1;
      }
    }
  }
  return results;
}

/**
 * GET /api/process-map
 * X넘버 → 풀 슬라이드 ID 매핑 반환
 *
 * 매칭 전략:
 *  1. process.json slideId (기본 바코드) + startTime
 *  2. CER app data 디렉토리 (풀 슬라이드 ID + mtime)
 *  3. slideId 접두사 일치 + mtime ≈ startTime (±3분) → 풀 ID 확정
 *
 * 응답: {
 *   "X10870_260402_036": {
 *     baseSlideId: "30260128005912",     // process.json 기본 바코드
 *     fullSlideId: "30260128005912_6335", // CER 매칭된 풀 ID (없으면 baseSlideId)
 *     startTime: 1775132373,
 *     endTime:   1775133362,
 *     state: "success"
 *   }, ...
 * }
 */
router.get('/', async (req, res) => {
  try {
    const [procRaw, cerRaw] = await Promise.all([
      // ① 모든 process.json 일괄 읽기
      execCommand(
        `find ${config.processDir} -maxdepth 2 -name process.json | sort | xargs cat 2>/dev/null`
      ),
      // ② CER app data 디렉토리 목록 + mtime (Unix 초)
      execCommand(
        `find ${config.cerDataDir} -maxdepth 1 -mindepth 1 -type d -printf '%T@ %f\\n' 2>/dev/null`
      ),
    ]);

    // process.json 파싱
    const procEntries = parseConcatJson(procRaw);

    // CER 디렉토리 목록 파싱: [{name, mtimeSec}]
    const cerDirs = cerRaw
      .trim().split('\n')
      .filter(Boolean)
      .map(line => {
        const sp = line.indexOf(' ');
        return { mtimeSec: parseFloat(line.substring(0, sp)), name: line.substring(sp + 1) };
      })
      .filter(d => d.name && d.name !== '$$working_in_progress');

    const WINDOW_SEC = 3 * 60; // ±3분

    const map = {};
    for (const e of procEntries) {
      if (!e.id) continue;

      const baseSlideId = e.slideId || null;
      let fullSlideId   = baseSlideId;

      // ① baseSlideId 가 있을 때: CER 디렉토리 이름이 baseSlideId로 시작 + mtime ≈ startTime
      if (baseSlideId && e.startTime) {
        const match = cerDirs.find(d =>
          d.name.startsWith(baseSlideId) &&
          Math.abs(d.mtimeSec - e.startTime) <= WINDOW_SEC
        );
        if (match) fullSlideId = match.name;
      }

      // ② baseSlideId 가 없거나 매칭 실패 → X넘버(e.id) 자체로 CER 디렉토리 매칭 시도
      //    예: e.id = "X10870_260403_002", CER dir = "X10870_260403_002_PR6Q"
      if (fullSlideId === baseSlideId && e.id && e.startTime) {
        const xMatch = cerDirs.find(d =>
          (d.name === e.id || d.name.startsWith(e.id + '_')) &&
          Math.abs(d.mtimeSec - e.startTime) <= WINDOW_SEC
        );
        if (xMatch) fullSlideId = xMatch.name;
      }

      map[e.id] = {
        baseSlideId,
        fullSlideId,
        startTime: e.startTime || null,
        endTime:   e.endTime   || null,
        state:     e.state     || null,
      };
    }

    res.json(map);
  } catch (err) {
    console.error('[process-map] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
