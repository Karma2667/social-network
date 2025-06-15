"use client";

import { useState, useEffect, useRef } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "@/app/lib/AuthContext";

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readBy: string[];
}

interface ChatProps {
  recipientId: string;
  recipientUsername: string;
}

export default function Chat({ recipientId, recipientUsername }: ChatProps) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !recipientId) {
      console.log("Chat: Missing userId or recipientId, skipping fetch");
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log("Chat: Fetching messages for recipientId:", recipientId);
        const res = await fetch(`/api/messages?recipientId=${encodeURIComponent(recipientId)}`, {
          headers: { "x-user-id": userId },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
        const data = await res.json();
        console.log("Chat: Messages fetched:", data);
        setMessages(data);

        const unreadMessages = data.filter((msg: Message) => !msg.isRead && msg.senderId !== userId);
        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map((msg: Message) =>
              fetch(`/api/messages?messageId=${msg._id}`, {
                method: "PATCH",
                headers: { "x-user-id": userId },
              })
            )
          );
        }
      } catch (err: any) {
        console.error("Chat: Error fetching messages:", err.message);
        setError(err.message);
      }
    };

    fetchMessages();
  }, [userId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !userId || !recipientId) return;

    setSending(true);
    try {
      console.log("Chat: Sending message to recipientId:", recipientId);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ recipientId, content: messageInput }),
      });
      if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
      const newMessage = await res.json();
      console.log("Chat: Message sent:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
    } catch (err: any) {
      console.error("Chat: Error sending message:", err.message);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="telegram-chat-container flex-grow-1 overflow-auto p-3" style={{ backgroundColor: "#f0f2f5" }}>
      {error && <Alert variant="danger" className="telegram-alert">{error}</Alert>}
      <div className="telegram-messages" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`telegram-message ${msg.senderId === userId ? "sent" : "received"} mb-2`}
            style={{
              display: "flex",
              flexDirection: msg.senderId === userId ? "row-reverse" : "row",
              alignItems: "flex-end",
            }}
          >
            <div
              className="telegram-message-bubble p-2 rounded"
              style={{
                backgroundColor: msg.senderId === userId ? "#0088cc" : "#e9ecef",
                color: msg.senderId === userId ? "#fff" : "#000",
                maxWidth: "70%",
                borderRadius: "10px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
              }}
            >
              {msg.content}
            </div>
            <div className="telegram-message-time text-muted small ms-2" style={{ marginBottom: "2px" }}>
              {new Date(msg.createdAt).toLocaleTimeString()}
              {msg.senderId === userId && (
                <span className={msg.isRead ? "is-read" : ""} style={{ marginLeft: "4px" }}>
                  {msg.isRead ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Form onSubmit={handleSendMessage} className="telegram-input-area mt-3">
        <div className="d-flex align-items-center">
          <Form.Control
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Сообщение для ${recipientUsername || "..."}`}
            className="telegram-input flex-grow-1 me-2"
            disabled={sending}
            style={{
              borderRadius: "20px",
              border: "1px solid #ced4da",
              padding: "8px 12px",
              fontSize: "14px",
            }}
          />
          <Button
            type="submit"
            disabled={sending || !messageInput.trim()}
            className="telegram-send-button"
            style={{
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              backgroundColor: "#0088cc",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#006bb3")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0088cc")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="white"
              viewBox="0 0 16 16"
            >
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm4.452-7.868L.756 7.848l4.921 3.034z" />
            </svg>
          </Button>
        </div>
      </Form>
    </div>
  );
}