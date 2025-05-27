import { WebSocket, WebSocketServer } from 'ws';
import { dbConnect } from '@/lib/mongoDB';
import Message from '@/models/Message';

const clients = new Map<string, WebSocket>();

export function setupWebSocket(wss: WebSocketServer) {
  console.log('WebSocket: Настройка обработчиков подключений');

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost:3001');
    const userId = url.searchParams.get('userId');

    if (!userId) {
      console.log('WebSocket: Отсутствует userId, закрытие соединения');
      ws.close(1008, 'Требуется userId');
      return;
    }

    clients.set(userId, ws);
    console.log(`WebSocket: Подключен клиент ${userId}, всего клиентов: ${clients.size}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`WebSocket: Получено сообщение от ${userId}:`, message);
        if (message.type === 'subscribe' && message.userId) {
          console.log(`WebSocket: Подписка для ${message.userId}`);
        }
      } catch (error: any) {
        console.error(`WebSocket: Ошибка обработки сообщения для ${userId}: ${error.message}`);
      }
    });

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`WebSocket: Клиент ${userId} отключен, осталось клиентов: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket: Ошибка для клиента ${userId}: ${error.message}`);
      clients.delete(userId);
    });

    ws.send(JSON.stringify({ type: 'connected', userId }));
  });
}

export async function broadcastMessage(senderId: string, recipientId: string, content: string) {
  if (!senderId || !recipientId) {
    console.error('WebSocket: Отсутствует senderId или recipientId');
    throw new Error('Требуются senderId и recipientId');
  }

  try {
    await dbConnect();
    console.log(`WebSocket: Сохранение сообщения от ${senderId} к ${recipientId}, content: ${content}`);
    const message = new Message({
      senderId,
      recipientId,
      content: content || '',
      createdAt: new Date(),
      isRead: false,
    });
    await message.save();

    const recipientWs = clients.get(recipientId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      console.log(`WebSocket: Отправка сообщения клиенту ${recipientId}`);
      recipientWs.send(
        JSON.stringify({
          type: 'message',
          message: {
            _id: message._id.toString(),
            senderId,
            recipientId,
            content,
            createdAt: message.createdAt,
            isRead: false,
          },
        })
      );
    } else {
      console.log(`WebSocket: Клиент ${recipientId} не подключен или соединение закрыто`);
    }

    const senderWs = clients.get(senderId);
    if (senderWs && senderWs.readyState === WebSocket.OPEN) {
      console.log(`WebSocket: Отправка сообщения клиенту ${senderId}`);
      senderWs.send(
        JSON.stringify({
          type: 'message',
          message: {
            _id: message._id.toString(),
            senderId,
            recipientId,
            content,
            createdAt: message.createdAt,
            isRead: false,
          },
        })
      );
    } else {
      console.log(`WebSocket: Клиент ${senderId} не подключен или соединение закрыто`);
    }

    return message;
  } catch (error: any) {
    console.error('WebSocket: Ошибка создания сообщения:', error.message);
    throw error;
  }
}