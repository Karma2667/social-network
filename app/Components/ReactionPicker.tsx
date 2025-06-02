'use client';

import { Button } from 'react-bootstrap';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export default function ReactionPicker({ onSelect }: ReactionPickerProps) {
  const emojis = ['👍', '❤️', '😂', '😢', '😮'];

  return (
    <div className="telegram-reaction-picker">
      {emojis.map((emoji) => (
        <Button
          key={emoji}
          variant="outline-secondary"
          className="telegram-reaction-option me-1"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}