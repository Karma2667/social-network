'use client';

import { Navbar, Nav } from 'react-bootstrap';

export default function AppNavbar({ userId }: { userId: string }) {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Navbar.Brand href="/">Social Network</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link href="/">Home</Nav.Link>
          <Nav.Link href="/chats">Chats</Nav.Link>
          <Nav.Link href="/communities">Communities</Nav.Link>
          <Nav.Link href={`/profile/${userId}`}>Profile</Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}