import { Router } from 'express';
import { execCommand } from '../services/sshPool.js';
import { parseAppLogSlideIds } from '../services/appLogParser.js';
import config from '../config.js';

const router = Router();

/**
 * GET /api/applog/slideids
 * App 로그 전체(로테이션 파일 포함)를 grep해서 슬라이드 완료 목록 반환
 *
 * 파일 패턴: miLab-app-*.log  +  miLab-app-*.log.*  (로테이션: .log.1 ~ .log.7 등)
 * 응답: [{ slideId, isoTimestamp, timestampMs, durationMs }, ...]
 */
router.get('/slideids', async (req, res) => {
  try {
    const dir = config.appLogDir;

    // 모든 로테이션 파일 포함: *.log 와 *.log.* (숫자 suffix)
    // grep -h : 파일명 출력 생략, 내용만
    const output = await execCommand(
      `grep -h "is finished" ${dir}/miLab-app-*.log ${dir}/miLab-app-*.log.* 2>/dev/null || true`
    ).catch(() => '');

    const entries = parseAppLogSlideIds(output);
    entries.sort((a, b) => b.timestampMs - a.timestampMs);

    res.json(entries);
  } catch (err) {
    console.error('[applog] slideids error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/applog/latest
 * 가장 최근 슬라이드 ID (Monitor 페이지용 폴링)
 */
router.get('/latest', async (req, res) => {
  try {
    const dir = config.appLogDir;
    const output = await execCommand(
      `grep "is finished" $(ls -t ${dir}/miLab-app-*.log ${dir}/miLab-app-*.log.* 2>/dev/null | head -1) 2>/dev/null | tail -1 || true`
    ).catch(() => '');
    const entries = parseAppLogSlideIds(output);
    res.json(entries[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
