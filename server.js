const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const dataFile = path.join(__dirname, 'data', 'feedback.json');
const Program = mongoose.model('Program', new mongoose.Schema({ title: { type: String, required: true }, code: { type: String, required: true }, folder: { type: String, default: 'General' } }, { timestamps: true }));
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingua';
app.use(express.json());
app.get('/favicon.ico', (request, response) => response.status(204).end());
app.get(['/playground.html', '/docs.html', '/about.html', '/feedback.html', '/playground.css', '/playground.js', '/feedback.js', '/files.js', '/programs.js'], (request, response) => {
  response.sendFile(path.join(__dirname, request.path));
});
app.get('/', (request, response) => response.redirect('/playground.html'));
app.get('/api/feedback', async (request, response) => {
  try { response.json(JSON.parse(await fs.readFile(dataFile, 'utf8'))); }
  catch (error) { response.status(500).json({ error: 'Could not load feedback.' }); }
});
app.post('/api/feedback', async (request, response) => {
  const name = String(request.body.name || '').trim();
  const email = String(request.body.email || '').trim();
  const message = String(request.body.message || '').trim();
  if (name.length < 2 || name.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100 || message.length < 10 || message.length > 500) return response.status(400).json({ error: 'Please check the form fields.' });
  try {
    const saved = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    saved.push({ name, email, message, date: new Date().toISOString() });
    await fs.writeFile(dataFile, JSON.stringify(saved, null, 2));
    response.json({ message: 'Feedback saved.' });
  } catch (error) { response.status(500).json({ error: 'Could not save feedback.' }); }
});
app.get('/api/programs', async (request, response) => {
  try { response.json(await Program.find().sort({ updatedAt: -1 })); }
  catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
app.post('/api/programs', async (request, response) => {
  const title = String(request.body.title || '').trim();
  const code = String(request.body.code || '').trim();
  const folder = String(request.body.folder || 'General').trim();
  if (!title || title.length > 80 || !code || code.length > 5000) return response.status(400).json({ error: 'Enter a title and code.' });
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder) || folder.length > 100) return response.status(400).json({ error: 'Use simple folder names separated by /.' });
  try { response.status(201).json(await Program.create({ title, code, folder })); }
  catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
app.put('/api/programs/:id', async (request, response) => {
  const title = String(request.body.title || '').trim();
  const code = String(request.body.code || '').trim();
  const folder = String(request.body.folder || 'General').trim();
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ error: 'Invalid program ID.' });
  if (!title || title.length > 80 || !code || code.length > 5000) return response.status(400).json({ error: 'Enter a title and code.' });
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder) || folder.length > 100) return response.status(400).json({ error: 'Use simple folder names separated by /.' });
  try {
    const program = await Program.findByIdAndUpdate(request.params.id, { title, code, folder }, { new: true });
    if (!program) return response.status(404).json({ error: 'Program not found.' });
    response.json(program);
  } catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
app.delete('/api/programs/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ error: 'Invalid program ID.' });
  try {
    const program = await Program.findByIdAndDelete(request.params.id);
    if (!program) return response.status(404).json({ error: 'Program not found.' });
    response.json({ message: 'Program deleted.' });
  } catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
mongoose.connect(mongoUrl).then(() => console.log('MongoDB connected')).catch(() => console.log('MongoDB is not available'));
app.listen(3000, () => console.log('Lingua is running at http://localhost:3000'));
