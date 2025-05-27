import { WebSocketServer } from 'ws';
import { setupWebSocket } from './websocket';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

function startWebSocketServer() {
  console.log(`WebSocket: Попытка запуска сервера на ws://localhost:${PORT}`);

  wss.on('listening', () => {
    console.log(`WebSocket: Сервер успешно запущен на ws://localhost:${PORT}`);
  });

  wss.on('error', (error: Error & { code?: string }) => {
    console.error(`WebSocket: Ошибка сервера: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
      console.error(`WebSocket: Порт ${PORT} занят. Попробуйте другой порт или закройте другие процессы.`);
      process.exit(1);
    }
  });

  // Инициализация обработки подключений
  setupWebSocket(wss);
}

// Запускаем сервер
try {
  startWebSocketServer();
} catch (error: any) {
  console.error(`WebSocket: Не удалось запустить сервер: ${error.message}`);
}