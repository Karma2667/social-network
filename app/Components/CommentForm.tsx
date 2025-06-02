import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';

interface CommentFormProps {
  postId: string;
  onSubmit: (content: string) => void;
}

export default function CommentForm({ postId, onSubmit }: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="telegram-comment-form mb-3">
      <Form.Group>
        <Form.Control
          className="telegram-comment-input"
          as="textarea"
          rows={2}
          placeholder="Напишите комментарий..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Form.Group>
      <Button variant="primary" type="submit" className="telegram-comment-button mt-2">
        Отправить
      </Button>
    </Form>
  );
}