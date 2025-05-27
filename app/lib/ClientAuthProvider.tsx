"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  userId: string | null;
  isInitialized: boolean;
  username: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isInitialized: false,
  username: null,
  logout: () => {},
});

function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  console.log("ClientAuthProvider: Начало инициализации, pathname:", pathname);

  const checkAuth = useCallback(async () => {
    console.log("ClientAuthProvider: Проверка авторизации, текущий путь:", pathname);
    const authToken = localStorage.getItem("authToken");
    console.log("ClientAuthProvider: Токен из localStorage:", authToken);

    if (!authToken) {
      console.log("ClientAuthProvider: Токен отсутствует, установка isInitialized");
      setIsInitialized(true);
      if (!["/login", "/register"].includes(pathname)) {
        console.log("ClientAuthProvider: Нет токена, перенаправление на /login");
        router.replace("/login");
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      console.log("ClientAuthProvider: Ответ /api/auth/me:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`Не удалось проверить авторизацию: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log("ClientAuthProvider: Данные /api/auth/me:", data);
      if (data.userId) {
        setUserId(data.userId);
        const storedUsername = localStorage.getItem("username") || data.username || null;
        setUsername(storedUsername);
        localStorage.setItem("username", storedUsername);
      } else {
        setUserId(null);
        setUsername(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("username");
      }
      setIsInitialized(true);

      if (!data.userId && !["/login", "/register"].includes(pathname)) {
        console.log("ClientAuthProvider: Нет userId, перенаправление на /login");
        router.replace("/login");
      }
    } catch (err) {
      console.error(
        "ClientAuthProvider: Ошибка инициализации:",
        err instanceof Error ? err.message : "Неизвестная ошибка"
      );
      setUserId(null);
      setUsername(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      setIsInitialized(true);
      if (!["/login", "/register"].includes(pathname)) {
        console.log("ClientAuthProvider: Ошибка авторизации, перенаправление на /login");
        router.replace("/login");
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    console.log("ClientAuthProvider: Выполнение logout, userId:", userId);
    setUserId(null);
    setUsername(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ userId, isInitialized, username, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export default ClientAuthProvider;