const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');
const exportPptxRouter = require('./routes/export-pptx');
const exportXlsxRouter = require('./routes/export-xlsx');
const reportsRouter = require('./routes/reports');
const compareRouter = require('./routes/compare');
const store = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1gb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', uploadRouter);
app.use('/api/export', exportPptxRouter);
app.use('/api/export', exportXlsxRouter);
app.use('/api', reportsRouter);
app.use('/api', compareRouter);

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}
setInterval(cleanupSessions, 5 * 60 * 1000);

app.set('sessions', sessions);
app.set('store', store);

app.listen(PORT, () => {
  console.log(`CNF Best Practice Report Generator running at http://localhost:${PORT}`);
});

module.exports = app;
