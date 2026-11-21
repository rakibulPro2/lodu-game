/* Copies the game files into ./www (the folder Capacitor packages into the app).
   Run with:  npm run web   */
const fs = require('fs');
const path = require('path');

const FILES = ['index.html', 'style.css', 'game.js', 'sound.js', 'ads-config.js',
               'manifest.webmanifest', 'sw.js'];
const DIRS = ['icons'];
const OUT = path.join(__dirname, 'www');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

FILES.forEach((f) => fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f)));
DIRS.forEach((d) => fs.cpSync(path.join(__dirname, d), path.join(OUT, d), { recursive: true }));

console.log('Web files copied to ./www');
