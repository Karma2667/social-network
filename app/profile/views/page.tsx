"use client";

import { useState, useEffect } from "react";
import { Container, Table } from "react-bootstrap";
import { useAuth } from "@/app/lib/AuthContext";

export default function ProfileViewsPage() {
  const { userId, isInitialized } = useAuth();
  const [views, setViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isInitialized) {
      setError("Пользователь не авторизован");
      setLoading(false);
      return;
    }

    const fetchViews = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile/views", {
          headers: { "x-user-id": userId },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Не удалось загрузить журнал просмотров");
        const data = await res.json();
        setViews(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchViews();
  }, [userId, isInitialized]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <Container>
      <h1>Журнал просмотров профиля</h1>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Дата просмотра</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr key={view._id}>
              <td>{view.viewerId.username || "Неизвестный пользователь"}</td>
              <td>{new Date(view.viewedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}