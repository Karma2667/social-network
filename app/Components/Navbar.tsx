'use client';

import { Navbar as BootstrapNavbar, Nav, NavDropdown } from 'react-bootstrap';
import { useAuth } from '@/app/lib/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faSearch,
  faUser,
  faComments,
  faUsers,
  faSignOutAlt,
  faSignInAlt,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';

export default function Navbar() {
  const { user, isInitialized, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <BootstrapNavbar
      bg="light"
      expand="lg"
      className="shadow-sm mb-4"
      style={{ borderBottom: '1px solid #dee2e6' }}
    >
      <BootstrapNavbar.Brand as={Link} href="/" className="ms-3 fs-4 fw-bold text-dark">
        Snapgramm
      </BootstrapNavbar.Brand>
      <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" className="me-3" />
      <BootstrapNavbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto ms-3">
          {user ? (
            <>
              <Nav.Link
                as={Link}
                href="/"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faHome} className="me-2" />
                Главная
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/search"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faSearch} className="me-2" />
                Поиск
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/profile"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Профиль
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/chat"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faComments} className="me-2" />
                Чаты
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/connections"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                Друзья
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/communities"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                Сообщества
              </Nav.Link>
            </>
          ) : (
            <>
              <Nav.Link
                as={Link}
                href="/login"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#17a2b8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                Вход
              </Nav.Link>
              <Nav.Link
                as={Link}
                href="/register"
                className="text-dark d-flex align-items-center me-3"
                style={{ transition: 'color 0.3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#28a745')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              >
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                Регистрация
              </Nav.Link>
            </>
          )}
          {user && (
            <Nav.Link
              onClick={handleLogout}
              className="text-dark d-flex align-items-center me-3"
              style={{ transition: 'color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dc3545')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
              Выйти
            </Nav.Link>
          )}
        </Nav>
      </BootstrapNavbar.Collapse>
    </BootstrapNavbar>
  );
}