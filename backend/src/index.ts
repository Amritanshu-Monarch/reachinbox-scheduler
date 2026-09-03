import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/emailQueue';
import { handleScheduleEmails } from './controllers/scheduleController';
import { initElasticsearch, searchEmailsInElasticsearch } from './services/elasticsearch';

const app = express();
app.use(cors());
app.use(express.json());

// Setup BullMQ Live UI Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// REST Routes
app.post('/api/emails/schedule', handleScheduleEmails);

app.get('/api/emails/search', async (req, res) => {
  const { q, userId } = req.query;
  const results = await searchEmailsInElasticsearch(q as string, userId as string);
  res.json(results);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  await initElasticsearch();
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 BullMQ Dashboard: http://localhost:${PORT}/admin/queues`);
});
