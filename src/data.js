import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataFilePath = join(__dirname, '../data.json');

let memoryData = null;

export function getAppData() {
  if (memoryData) return memoryData;
  let defaultData = { emotes: ['❤️', '😂', '🍿', '🔥', '😮'], sounds: [] };
  if (fs.existsSync(dataFilePath)) {
    try {
      memoryData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    } catch(e) {
      memoryData = defaultData;
    }
  } else {
    memoryData = defaultData;
    saveAppData();
  }
  return memoryData;
}

export function saveAppData() {
  if (memoryData) {
    fs.writeFileSync(dataFilePath, JSON.stringify(memoryData, null, 2));
  }
}
