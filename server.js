const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
try { process.loadEnvFile(); } catch {}
const Program = mongoose.model('Program', new mongoose.Schema({ owner: { type: mongoose.Schema.Types.ObjectId, index: true }, title: { type: String, required: true }, code: { type: String, required: true }, folder: { type: String, default: 'General' } }, { timestamps: true }));
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zuno';
app.use(express.json());
app.get('/design.css', (request, response) => response.sendFile(path.join(__dirname, 'design.css')));
app.get('/premium.css', (request, response) => response.sendFile(path.join(__dirname, 'premium.css')));
app.get(['/interactions.css', '/interactions.js'], (request, response) => response.sendFile(path.join(__dirname, request.path)));
app.get(['/workspace.css', '/workspace.js'], (request, response) => response.sendFile(path.join(__dirname, request.path)));
app.get('/favicon.ico', (request, response) => response.status(204).end());
app.get(['/playground.html', '/docs.html', '/about.html', '/playground.css', '/playground.js', '/engine.js', '/files.js', '/programs.js'], (request, response) => {
  response.sendFile(path.join(__dirname, request.path));
});
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.get(['/','/index.html'], (request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get('/landing.css', (request, response) => response.sendFile(path.join(__dirname, 'landing.css')));
app.use('/api/assistant', require('./assistant-api'));
app.use('/api', require('./accounts'));
app.get('/api/programs', async (request, response) => {
  try { response.json(await Program.find({ owner: request.user._id }).sort({ updatedAt: -1 })); }
  catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
app.post('/api/programs', async (request, response) => {
  const title = String(request.body.title || '').trim();
  const code = String(request.body.code || '').trim();
  const folder = String(request.body.folder || 'General').trim();
  if (!title || title.length > 80 || !code || code.length > 5000) return response.status(400).json({ error: 'Enter a title and code.' });
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder) || folder.length > 100) return response.status(400).json({ error: 'Use simple folder names separated by /.' });
  try { response.status(201).json(await Program.create({ title, code, folder, owner: request.user._id })); }
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
    const program = await Program.findOneAndUpdate({ _id: request.params.id, owner: request.user._id }, { title, code, folder }, { new: true });
    if (!program) return response.status(404).json({ error: 'Program not found.' });
    response.json(program);
  } catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
app.delete('/api/programs/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ error: 'Invalid program ID.' });
  try {
    const program = await Program.findOneAndDelete({ _id: request.params.id, owner: request.user._id });
    if (!program) return response.status(404).json({ error: 'Program not found.' });
    response.json({ message: 'Program deleted.' });
  } catch (error) { response.status(503).json({ error: 'MongoDB is not available.' }); }
});
mongoose.connect(mongoUrl).then(() => console.log('MongoDB connected')).catch(() => console.log('MongoDB is not available'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Zuno is running at http://localhost:' + port));
