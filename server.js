const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('ws');
const { setupWebSocket } = require('./lib/websocket');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    console.log(`Server: HTTP запрос на ${parsedUrl.pathname}`);
    handle(req, res, parsedUrl);
  });

  const wss = new Server({ port: 3001 }); // Используем отдельный порт для WebSocket

  setupWebSocket(wss);

  server.listen(3000, (err) => {
    if (err) {
      console.error('Server: Ошибка запуска HTTP сервера:', err);
      throw err;
    }
    console.log('> HTTP сервер готов на http://localhost:3000');
  });

  wss.on('listening', () => {
    console.log('> WebSocket сервер готов на ws://localhost:3001');
  });

  wss.on('error', (err) => {
    console.error('Server: Ошибка WebSocket сервера:', err);
  });
}).catch((err) => {
  console.error('Server: Ошибка подготовки приложения:', err);
});