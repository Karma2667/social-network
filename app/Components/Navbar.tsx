'use client';

import { Navbar, Nav } from 'react-bootstrap';
import { useAuth } from '@/app/lib/ClientAuthProvider';
import Link from 'next/link';

export default function AppNavbar() {
  const { userId, username, logout } = useAuth();

  return (
    <Navbar bg="light" expand="lg" className="telegram-header">
      <Navbar.Brand as={Link} href="/">Социальная сеть</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          {userId && (
            <>
              <Nav.Link as={Link} href="/">Главная</Nav.Link>
              <Nav.Link as={Link} href="/search">Поиск</Nav.Link> {/* Добавлена ссылка на /search */}
              <Nav.Link as={Link} href="/profile">Профиль</Nav.Link>
              <Nav.Link as={Link} href="/chat">Чаты</Nav.Link>
              <Nav.Link onClick={logout}>Выйти</Nav.Link>
            </>
          )}
          {!userId && (
            <>
              <Nav.Link as={Link} href="/login">Вход</Nav.Link>
              <Nav.Link as={Link} href="/register">Регистрация</Nav.Link>
            </>
          )}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}