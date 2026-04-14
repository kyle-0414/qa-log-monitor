import { Router } from 'express';
import { execCommand } from '../services/sshPool.js';
import { parseFullLog } from '../services/logParser.js';
import config from '../config.js';

const router = Router();

// List available log files
router.get('/', async (req, res) => {
  try {
    const output = await execCommand(
      `ls -lt ${config.logDir}/aidmat.*.log ${config.logDir}/aidmat.*.log.gz 2>/dev/null | head -200`
    );
    const files = output.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split(/\s+/);
      return {
        permissions: parts[0],
        size: parseInt(parts[4]),
        date: `${parts[5]} ${parts[6]} ${parts[7]}`,
        filename: parts[8]?.split('/').pop() || '',
        path: parts[8] || '',
        isCompressed: parts[8]?.endsWith('.gz') || false,
      };
    }).filter(f => f.filename);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parse a specific log file
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    // Sanitize filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = `${config.logDir}/${filename}`;
    const isGz = filename.endsWith('.gz');
    const cmd = isGz ? `zcat ${filePath}` : `cat ${filePath}`;
    const content = await execCommand(cmd);
    const parsed = parseFullLog(content);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search across log files for a pattern
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    // Sanitize query to prevent command injection
    const safeQuery = query.replace(/[`$\\;"'|&<>(){}[\]!#~]/g, '');
    if (!safeQuery) return res.status(400).json({ error: 'Invalid query' });

    // Search in .log files
    const grepCmd = `grep -n "${safeQuery}" ${config.logDir}/aidmat.*.log 2>/dev/null | head -200`;
    const output = await execCommand(grepCmd);

    const results = {};
    output.trim().split('\n').filter(Boolean).forEach(line => {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        const file = match[1].split('/').pop();
        const lineNum = parseInt(match[2]);
        const text = match[3].trim();
        // Extract timestamp and processId if available
        const tsMatch = text.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const pidMatch = text.match(/processId=(\S+)|id[=:](\S+?)[\s,}]/);
        if (!results[file]) results[file] = [];
        results[file].push({
          line: lineNum,
          timestamp: tsMatch ? tsMatch[1] : null,
          processId: pidMatch ? (pidMatch[1] || pidMatch[2]) : null,
          text: text.substring(0, 300),
        });
      }
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
