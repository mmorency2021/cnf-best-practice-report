const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');
const exportPptxRouter = require('./routes/export-pptx');
const exportXlsxRouter = require('./routes/export-xlsx');
const exportCsvRouter = require('./routes/export-csv');
const exportHtmlRouter = require('./routes/export-html');
const reportsRouter = require('./routes/reports');
const compareRouter = require('./routes/compare');
const store = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1gb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { etag: false, maxAge: 0 }));

app.use('/api', uploadRouter);
app.use('/api/export', exportPptxRouter);
app.use('/api/export', exportXlsxRouter);
app.use('/api/export', exportCsvRouter);
app.use('/api/export', exportHtmlRouter);
app.use('/api', reportsRouter);
app.use('/api', compareRouter);

const sessions = new Map();

app.set('sessions', sessions);
app.set('store', store);

app.listen(PORT, () => {
  console.log(`CNF Best Practice Report Generator running at http://localhost:${PORT}`);
});

module.exports = app;
