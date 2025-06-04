'use client';

import { Button } from 'react-bootstrap';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export default function ReactionPicker({ onSelect }: ReactionPickerProps) {
  const emojis = ['🤡', '👍', '👎', '❤️', '😂', '😢', '😮', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉'];

  return (
    <div className="reaction-picker">
      {emojis.map((emoji) => (
        <Button
          key={emoji}
          variant="outline-secondary"
          className="reaction-option p-1"
          onClick={() => onSelect(emoji)}
          style={{ fontSize: '1.2rem', padding: '2px 6px' }}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}