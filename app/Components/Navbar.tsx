"use client";

import { useAuth } from '@/lib/ClientAuthProvider';
import { Navbar as BSNavbar, Nav, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { userId, username, isInitialized } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  console.log('Navbar: Рендеринг:', { userId, username, isInitialized });

  useEffect(() => {
    if (userId && isInitialized) {
      fetch('/api/notifications', {
        headers: { 'x-user-id': userId },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('Navbar: Уведомления загружены:', data);
          setNotifications(data);
        })
        .catch((err) => console.error('Navbar: Ошибка загрузки уведомлений:', err.message));
    }
  }, [userId, isInitialized]);

  if (!isInitialized) {
    console.log('Navbar: Ожидание инициализации');
    return null;
  }

  return (
    <BSNavbar bg="light" expand="lg" className="mb-3">
      <BSNavbar.Brand as={Link} href="/chat">Social Network</BSNavbar.Brand>
      <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BSNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={Link} href="/chat">Чат</Nav.Link>
          <Nav.Link as={Link} href="/profile">Профиль</Nav.Link>
        </Nav>
        <Nav>
          <Nav.Link disabled>@{username || 'Гость'}</Nav.Link>
          {notifications.length > 0 && (
            <Badge bg="danger" className="ms-2">{notifications.length}</Badge>
          )}
        </Nav>
      </BSNavbar.Collapse>
    </BSNavbar>
  );
}