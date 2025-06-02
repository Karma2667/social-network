'use client';

import { Navbar as BootstrapNavbar, Nav } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import Link from 'next/link';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <BootstrapNavbar bg="light" expand="lg" className="telegram-header">
      <BootstrapNavbar.Brand as={Link} href="/">Социальная сеть</BootstrapNavbar.Brand>
      <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BootstrapNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          {user && (
            <>
              <Nav.Link as={Link} href="/">Главная</Nav.Link>
              <Nav.Link as={Link} href="/search">Поиск</Nav.Link>
              <Nav.Link as={Link} href="/profile">Профиль</Nav.Link>
              <Nav.Link as={Link} href="/chat">Чаты</Nav.Link>
              <Nav.Link as={Link} href="/connections">Контакты</Nav.Link>
              <Nav.Link onClick={logout}>Выйти</Nav.Link>
            </>
          )}
          {!user && (
            <>
              <Nav.Link as={Link} href="/login">Вход</Nav.Link>
              <Nav.Link as={Link} href="/register">Регистрация</Nav.Link>
            </>
          )}
        </Nav>
      </BootstrapNavbar.Collapse>
    </BootstrapNavbar>
  );
}