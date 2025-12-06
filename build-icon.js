const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple 256x256 icon
const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, 256, 256);
gradient.addColorStop(0, '#3B82F6');
gradient.addColorStop(1, '#1E40AF');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 256, 256);

// White circle in center
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(128, 128, 80, 0, Math.PI * 2);
ctx.fill();

// Blue graduation cap icon (simplified)
ctx.fillStyle = '#1E40AF';
ctx.font = 'bold 120px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('📚', 128, 135);

// Save to file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/icon.png', buffer);
console.log('Icon created successfully!');
