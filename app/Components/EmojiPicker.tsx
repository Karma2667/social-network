'use client';

import { useState } from 'react';
import { Button } from 'react-bootstrap';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['👍', '❤️', '😂', '😢', '😮', '🤡', '😡', '🤯', '🤩', '👏', '🙌', '🔥', '🎉', '😎', '🥳', '💪', '🌟', '🎵', '🍕', '🚀'];

  return (
    <div className="position-relative">
      <Button
        variant="outline-secondary"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        style={{ padding: '2px 6px' }}
      >
        😊
      </Button>
      {showEmojiPicker && (
        <div className="emoji-picker position-absolute bg-light border rounded p-2" style={{ zIndex: 1000, top: '100%', right: 0 }}>
          {emojis.map((emoji) => (
            <Button
              key={emoji}
              variant="link"
              onClick={() => {
                onSelect(emoji);
                setShowEmojiPicker(false);
              }}
              style={{ padding: '2px 6px', fontSize: '1.2rem', lineHeight: 1 }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}