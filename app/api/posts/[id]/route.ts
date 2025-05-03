import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('PUT /api/posts/[id]: Connecting to MongoDB...');
    await dbConnect();
    console.log('PUT /api/posts/[id]: MongoDB connected');

    const postId = params.id;
    const { content, images, userId } = await request.json();
    console.log('PUT /api/posts/[id] received:', { postId, content, images, userId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (content) post.content = content;
    if (images) post.images = images;

    await post.save();
    await post.populate({
      path: 'user',
      select: 'username avatar',
      options: { strictPopulate: false },
    });

    console.log('PUT /api/posts/[id]: Updated post:', post);
    return NextResponse.json(post);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('PUT /api/posts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update post', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('DELETE /api/posts/[id]: Connecting to MongoDB...');
    await dbConnect();
    console.log('DELETE /api/posts/[id]: MongoDB connected');

    const postId = params.id;
    const userId = request.headers.get('x-user-id');
    console.log('DELETE /api/posts/[id] received:', { postId, userId });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await post.deleteOne();
    console.log('DELETE /api/posts/[id]: Deleted post:', postId);
    return NextResponse.json({ message: 'Post deleted' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/posts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete post', details: errorMessage }, { status: 500 });
  }
}