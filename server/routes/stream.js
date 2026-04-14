import { Router } from 'express';
import { getConnectionFor, execCommandFor } from '../services/sshPool.js';
import { parseLine } from '../services/logParser.js';
import config from '../config.js';

const router = Router();

function getSshCfg(query) {
  if (query.host && query.user) {
    return {
      host: query.host,
      port: parseInt(query.port) || 22,
      username: query.user,
      password: query.pass || '',
    };
  }
  return config.ssh;
}

router.get('/', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('\n');

  let stream = null;
  let closed = false;
  const sshCfg = getSshCfg(req.query);
  const logDir = config.logDir;

  const sendEvent = (type, data) => {
    if (closed) return;
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let targetFile = req.query.file;
    if (!targetFile || targetFile === 'latest') {
      const output = await execCommandFor(sshCfg, `ls -t ${logDir}/aidmat.*.log 2>/dev/null | head -1`);
      targetFile = output.trim();
    } else {
      if (targetFile.includes('..') || targetFile.includes('/')) {
        sendEvent('error', { message: 'Invalid filename' });
        res.end();
        return;
      }
      targetFile = `${logDir}/${targetFile}`;
    }

    sendEvent('connection', { status: 'connected', file: targetFile.split('/').pop() });

    try {
      const headLines = await execCommandFor(sshCfg, `head -200 ${targetFile}`);
      for (const line of headLines.split('\n')) {
        if (!line.trim()) continue;
        const parsed = parseLine(line);
        if (parsed && parsed.type === 'device-info') sendEvent(parsed.type, parsed);
      }
    } catch (headErr) {
      console.error('Failed to read head:', headErr.message);
    }

    const initialLines = await execCommandFor(sshCfg, `tail -500 ${targetFile}`);
    const lines = initialLines.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseLine(line);
      if (parsed) sendEvent(parsed.type, parsed);
      sendEvent('raw', { line: line.substring(0, 500) });
    }
    sendEvent('initial-load-done', { lineCount: lines.length });

    const conn = await getConnectionFor(sshCfg);
    conn.exec(`tail -f -n 0 ${targetFile}`, (err, s) => {
      if (err) { sendEvent('error', { message: err.message }); res.end(); return; }
      stream = s;
      let buffer = '';

      stream.on('data', (data) => {
        buffer += data.toString();
        const parts = buffer.split('\n');
        buffer = parts.pop();
        for (const line of parts) {
          if (!line.trim()) continue;
          const parsed = parseLine(line);
          if (parsed) sendEvent(parsed.type, parsed);
          sendEvent('raw', { line: line.substring(0, 500) });
        }
      });

      stream.on('close', () => { sendEvent('connection', { status: 'stream-closed' }); if (!closed) res.end(); });
      stream.stderr.on('data', (data) => { sendEvent('error', { message: data.toString() }); });
    });

  } catch (err) {
    sendEvent('error', { message: err.message });
    if (!closed) res.end();
  }

  req.on('close', () => {
    closed = true;
    if (stream) stream.close();
  });
});

export default router;
