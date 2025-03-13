'use client';

import { useState, useEffect } from 'react';
import { Container, Form, ListGroup } from 'react-bootstrap';
import Link from 'next/link';
import AppNavbar from '@/app/Components/Navbar';

export default function Search({ userId }: { userId: string | null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <>
      <AppNavbar userId={userId} />
      <Container className="my-4">
        <h1>Search Users</h1>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter username to search"
          />
        </Form.Group>
        {loading && <p>Searching...</p>}
        {error && <p className="text-danger">{error}</p>}
        <ListGroup>
          {results.map((user) => (
            <ListGroup.Item key={user._id}>
              {user.username}
              <div className="float-end">
                <Link
                  href={`/profile/${user._id}`}
                  className="btn btn-outline-primary btn-sm me-2"
                >
                  View Profile
                </Link>
                <Link
                  href={`/chats?recipientId=${user._id}`}
                  className="btn btn-outline-success btn-sm"
                >
                  Message
                </Link>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {query && !loading && results.length === 0 && <p>No users found</p>}
      </Container>
    </>
  );
}