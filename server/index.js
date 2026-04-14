import express from 'express';
import cors from 'cors';
import config from './config.js';
import logsRouter from './routes/logs.js';
import streamRouter from './routes/stream.js';
import applogRouter from './routes/applog.js';
import processmapRouter from './routes/processmap.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/logs', logsRouter);
app.use('/api/stream', streamRouter);
app.use('/api/applog', applogRouter);
app.use('/api/process-map', processmapRouter);

app.listen(config.apiPort, () => {
  console.log(`[Server] QA Log Monitor API running on http://localhost:${config.apiPort}`);
});
