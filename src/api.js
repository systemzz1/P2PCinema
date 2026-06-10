import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAppData, saveAppData } from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApiRouter(io) {
  const router = express.Router();
  
  const uploadsDir = join(__dirname, '../public/uploads/sounds');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
  });
  
  const upload = multer({ 
    storage, 
    limits: { fileSize: 2 * 1024 * 1024 } 
  });

  router.get('/assets', (req, res) => {
    res.json(getAppData());
  });

  router.post('/add-emote', (req, res) => {
    const { emote } = req.body;
    if (!emote) return res.status(400).json({ success: false, error: 'Emote cannot be empty' });
    
    const appData = getAppData();
    if (appData.emotes.includes(emote)) return res.json({ success: false, error: 'Emote already exists!' });
    
    appData.emotes.push(emote);
    saveAppData();
    io.emit('assets-updated', appData);
    res.json({ success: true });
  });

  router.post('/upload-sound', upload.single('soundFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File upload failed or too large' });
    const { name, icon } = req.body;
    const newSound = {
      id: Date.now().toString(),
      name: name || 'Custom Sound',
      icon: icon || '🔊',
      filename: req.file.filename
    };
    
    const appData = getAppData();
    appData.sounds.push(newSound);
    saveAppData();
    io.emit('assets-updated', appData);
    res.json({ success: true });
  });

  router.post('/delete-asset', (req, res) => {
    const { type, id } = req.body;
    const appData = getAppData();
    
    if (type === 'emote') {
      appData.emotes = appData.emotes.filter(e => e !== id);
    } else if (type === 'sound') {
      const sound = appData.sounds.find(s => s.id === id);
      if (sound) {
        try { fs.unlinkSync(join(uploadsDir, sound.filename)); } catch(e){}
        appData.sounds = appData.sounds.filter(s => s.id !== id);
      }
    }
    saveAppData();
    io.emit('assets-updated', appData);
    res.json({ success: true });
  });

  router.post('/auth-host', (req, res) => {
    const { password } = req.body;
    if (password === process.env.HOST_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  });

  // Speed Test endpoint for Host Stream Quality configuration
  router.post('/speedtest', (req, res) => {
    // We don't need to do anything with the payload. 
    // The client measures how long it took to upload it.
    res.json({ success: true });
  });

  return router;
}
