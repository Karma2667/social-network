'use client';

import { Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import NotificationItem from './NotificationItem';

export default function AppNavbar() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        console.log('Fetched notifications:', data);
        setNotifications(data);
      } catch (error) {
        console.error('Fetch notifications error:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('userIdUpdated'));
    router.push('/');
  };

  console.log('Navbar userId:', userId);

  return (
    <Navbar bg="light" expand="lg">
      <Navbar.Brand as={Link} href="/">Social Network</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={Link} href="/">Home</Nav.Link>
          <Nav.Link as={Link} href="/communities">Communities</Nav.Link>
          <Nav.Link as={Link} href="/chats">Chats</Nav.Link>
          <Nav.Link as={Link} href="/search">Search</Nav.Link>
          {userId && <Nav.Link as={Link} href={`/profile/${userId}`}>Profile</Nav.Link>}
        </Nav>
        <Nav>
          {userId ? (
            <>
              <NavDropdown
                title={<span>🔔 ({notifications.filter(n => !n.read).length})</span>}
                id="notifications-dropdown"
                style={{ maxWidth: '300px' }}
              >
                {notifications.length === 0 ? (
                  <NavDropdown.Item>No notifications</NavDropdown.Item>
                ) : (
                  notifications.map((notif) => <NotificationItem key={notif._id} notif={notif} />)
                )}
              </NavDropdown>
              <Button variant="outline-danger" size="sm" onClick={handleLogout} className="ms-2">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Nav.Link as={Link} href="/login">Login</Nav.Link>
              <Nav.Link as={Link} href="/register">Register</Nav.Link>
            </>
          )}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}