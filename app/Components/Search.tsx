'use client';

import { useState } from 'react';
import { Form, Button, ListGroup } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ _id: string; username: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to search users');
      }
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="my-4">
      <Form onSubmit={handleSearch}>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for users..."
          />
        </Form.Group>
        <Button type="submit" variant="primary">
          Search
        </Button>
      </Form>
      {error && <p className="text-danger mt-2">{error}</p>}
      {results.length > 0 && (
        <ListGroup className="mt-3">
          {results.map((user) => (
            <ListGroup.Item
              key={user._id}
              action
              onClick={() => router.push(`/profile/${user._id}`)}
            >
              {user.username}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}