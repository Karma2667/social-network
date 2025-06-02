'use client';

import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { Paperclip } from 'react-bootstrap-icons';

interface PostFormProps {
  onSubmit: (content: string, images: File[]) => void;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content, images);
      setContent('');
      setImages([]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <Form.Group className="mb-3">
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Что у вас нового?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Form.Group>
      <Form.Group className="mb-3 d-flex align-items-center">
        <Form.Label htmlFor="image-upload" className="me-2">
          <Paperclip size={24} style={{ cursor: 'pointer' }} />
        </Form.Label>
        <Form.Control
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          id="image-upload"
          style={{ display: 'none' }}
        />
        <span>{images.length > 0 ? `${images.length} изображение(я) выбрано` : 'Прикрепить изображение'}</span>
      </Form.Group>
      <Button variant="primary" type="submit" className="mt-2">
        Опубликовать
      </Button>
    </Form>
  );
}