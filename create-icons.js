const fs = require('fs');

// Create SVG icons that can be converted to PNG
const createSVGIcon = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#20b2aa" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">TM</text>
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.08}" fill="white" opacity="0.9"/>
</svg>`;
};

// Save SVG files
fs.writeFileSync('public/logo.svg', createSVGIcon(512));
console.log('Created SVG icon at public/logo.svg');

// Create a simple HTML converter
const htmlConverter = `<!DOCTYPE html>
<html>
<head><title>Convert SVG to PNG</title></head>
<body>
  <h2>PWA Icon Converter</h2>
  <canvas id="canvas192" width="192" height="192"></canvas>
  <canvas id="canvas512" width="512" height="512"></canvas>
  <br><br>
  <a id="link192" download="logo192.png">Download 192x192 PNG</a><br>
  <a id="link512" download="logo512.png">Download 512x512 PNG</a>
  
  <script>
    function createIcon(size) {
      const canvas = document.getElementById('canvas' + size);
      const ctx = canvas.getContext('2d');
      
      // Background with rounded corners
      ctx.fillStyle = '#20b2aa';
      ctx.fillRect(0, 0, size, size);
      
      // TM text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.floor(size * 0.3) + 'px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TM', size/2, size/2);
      
      // Medical cross indicator
      ctx.beginPath();
      ctx.arc(size * 0.75, size * 0.25, size * 0.08, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      
      // Update download link
      const link = document.getElementById('link' + size);
      link.href = canvas.toDataURL('image/png');
    }
    
    createIcon(192);
    createIcon(512);
  </script>
</body>
</html>`;

fs.writeFileSync('icon-converter.html', htmlConverter);
console.log('Created icon-converter.html - open this in browser to download PNG icons');