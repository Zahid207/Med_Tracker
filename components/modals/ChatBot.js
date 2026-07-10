"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  // --------------------------------------- ref for container scroll to bottom ---------------------------------------
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isOpen, messages, loading]);

  // -------------------------- Refs for sidebar and collapse button outside click detection --------------------------
  const chatBoxRef = useRef(null);
  useEffect(() => {
    const handleSidebarClickOutside = (event) => {
      if (isOpen) {
        if (chatBoxRef.current && !chatBoxRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleSidebarClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleSidebarClickOutside);
  }, [isOpen]);

  //-------- poasting the message to the server and getting the response back and updating the messages array --------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: data.content },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content:
              data.error || "Something went wrong. Please try again later.",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to text Gemini", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Unable to connect to the server. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated" || !userId) {
    return
  } else {
    return (
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-2xl transition-all flex items-center justify-center scale-100 hover:scale-105 min-[782px]:mb-3 min-[782px]:mr-3 "
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        )}

        {isOpen && (
          <div
            ref={chatBoxRef}
            className="bg-white border border-slate-200 w-96 h-140 rounded-2xl shadow-2xl flex flex-col overflow-hidden min-[782px]:mb-4 min-[782px]:mr-4 animate-in "
          >
            {/* Header */}
            <div className="bg-blue-500 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg cursor-default">MedAI</h3>
                <p className="text-sm text-blue-100 cursor-default">
                  Your prsonal AI assistant, Ask me anything
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-blue-600 p-1 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={containerRef}
              className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 thin-scrollbar"
            >
              {messages.length === 0 && (
                <div className="text-center text-slate-600 mt-10 cursor-default">
                  👋 Hello! How can I help you today?
                </div>
              )}
              {messages.map((m, index) => (
                <div
                  key={index}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none whitespace-pre-line"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-400 border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm cursor-default">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-slate-200 bg-white flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 bg-slate-50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 pr-3 rounded-xl transition-all flex items-center justify-center disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <Send className="h-4 w-6 scale-125" />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
}
