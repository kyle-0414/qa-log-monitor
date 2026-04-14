import { Client } from 'ssh2';
import config from '../config.js';

// Multi-device pool: key = "host:port:username"
const pool = new Map(); // key -> { conn, connecting, waiters }

function makeKey(sshCfg) {
  return `${sshCfg.host}:${sshCfg.port}:${sshCfg.username}`;
}

function getEntry(key) {
  if (!pool.has(key)) pool.set(key, { conn: null, connecting: false, waiters: [] });
  return pool.get(key);
}

export function getConnectionFor(sshCfg) {
  return new Promise((resolve, reject) => {
    const key = makeKey(sshCfg);
    const entry = getEntry(key);

    if (entry.conn && entry.conn._sock && !entry.conn._sock.destroyed) {
      return resolve(entry.conn);
    }

    if (entry.connecting) {
      const interval = setInterval(() => {
        if (entry.conn && entry.conn._sock && !entry.conn._sock.destroyed) {
          clearInterval(interval);
          resolve(entry.conn);
        }
      }, 100);
      setTimeout(() => { clearInterval(interval); reject(new Error('Connection timeout')); }, 10000);
      return;
    }

    entry.connecting = true;
    const conn = new Client();
    conn.on('ready', () => {
      entry.conn = conn;
      entry.connecting = false;
      console.log('[SSH] Connected to', sshCfg.host);
      resolve(conn);
    });
    conn.on('error', (err) => {
      entry.connecting = false;
      console.error('[SSH] Connection error:', err.message);
      reject(err);
    });
    conn.on('close', () => {
      entry.conn = null;
      entry.connecting = false;
      console.log('[SSH] Connection closed:', sshCfg.host);
    });
    conn.connect({
      host: sshCfg.host,
      port: sshCfg.port,
      username: sshCfg.username,
      password: sshCfg.password,
      readyTimeout: 10000,
    });
  });
}

export function execCommandFor(sshCfg, command) {
  return new Promise(async (resolve, reject) => {
    try {
      const conn = await getConnectionFor(sshCfg);
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('data', (data) => { stdout += data.toString(); });
        stream.stderr.on('data', (data) => { stderr += data.toString(); });
        stream.on('close', () => {
          if (stderr && !stdout) reject(new Error(stderr));
          else resolve(stdout);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Backward-compatible default-device exports
export function getConnection() {
  return getConnectionFor(config.ssh);
}

export function execCommand(command) {
  return execCommandFor(config.ssh, command);
}
