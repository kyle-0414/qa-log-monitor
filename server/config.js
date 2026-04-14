import dotenv from 'dotenv';
dotenv.config();

export default {
  ssh: {
    host: process.env.SSH_HOST || '192.168.128.104',
    port: parseInt(process.env.SSH_PORT || '2022'),
    username: process.env.SSH_USER || 'milabr',
    password: process.env.SSH_PASSWORD || '',
  },
  logDir:     process.env.LOG_DIR      || '/home/nvidia/working/log',
  logGlob:    process.env.LOG_GLOB     || 'aidmat.*.log',
  appLogDir:  process.env.APP_LOG_DIR  || '/mnt/ssd/app_log/kr.noul.cer',
  processDir: process.env.PROCESS_DIR  || '/mnt/ssd/aidmat/process',
  cerDataDir: process.env.CER_DATA_DIR || '/mnt/ssd/app_data/kr.noul.cer',
  apiPort:    parseInt(process.env.API_PORT || '3001'),
};
