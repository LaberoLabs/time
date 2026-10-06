import fs from 'node:fs';
import path from 'node:path';

// Dev helper: POST /__shot?name=x with a PNG data URL body writes shots/x.png
export default {
  base: './', // relative URLs, so the build works from any path (GitHub Pages serves it under /<repo>/)
  plugins: [{
    name: 'shot-writer',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') || 'shot';
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          const b64 = body.replace(/^data:image\/\w+;base64,/, '');
          fs.mkdirSync('shots', { recursive: true });
          fs.writeFileSync(path.join('shots', name.replace(/[^\w.-]/g, '') + '.png'), Buffer.from(b64, 'base64'));
          res.end('ok');
        });
      });
    },
  }],
};
