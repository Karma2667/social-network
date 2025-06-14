import { NextResponse } from 'next/server';
import { connectToDB, mongoose } from '@/app/lib/mongoDB';
import Post from '@/models/Post';

// Интерфейс для реакции
interface Reaction {
  emoji: string;
  users: string[];
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const { userId, emoji } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Некорректные ID' }, { status: 400 });
    }

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Требуется emoji' }, { status: 400 });
    }

    const allowedEmojis = ['🤡', '👍', '👎', '❤️', '😂', '😢', '😮', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉'];
    if (!allowedEmojis.includes(emoji)) {
      return NextResponse.json({ error: 'Недопустимый emoji' }, { status: 400 });
    }

    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const headerUserId = request.headers.get('x-user-id');
    if (!authToken || !headerUserId || headerUserId !== userId) {
      return NextResponse.json({ error: 'Неавторизованный доступ' }, { status: 401 });
    }

    const post = await Post.findById(params.id).populate('userId', 'username');
    if (!post) {
      return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
    }

    post.reactions = post.reactions || [];
    post.likes = post.likes || [];

    const userCurrentReaction = post.reactions.find((r: Reaction) => r.users.includes(userId));
    if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
      userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== userId);
      if (userCurrentReaction.users.length === 0) {
        post.reactions = post.reactions.filter((r: Reaction) => r.users.length > 0);
      }
    } else {
      if (userCurrentReaction) {
        userCurrentReaction.users = userCurrentReaction.users.filter((id: string) => id !== userId);
        if (userCurrentReaction.users.length === 0) {
          post.reactions = post.reactions.filter((r: Reaction) => r.users.length > 0);
        }
      }
      const reactionIndex = post.reactions.findIndex((r: Reaction) => r.emoji === emoji);
      if (reactionIndex === -1) {
        post.reactions.push({ emoji, users: [userId] });
      } else {
        post.reactions[reactionIndex].users.push(userId);
      }
    }

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
    }

    await post.save();

    return NextResponse.json({
      _id: post._id.toString(),
      likes: post.likes,
      reactions: post.reactions,
    });
  } catch (error: any) {
    console.error('Ошибка в POST /api/posts/[id]/reactions:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}