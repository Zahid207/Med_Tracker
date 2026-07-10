"use client";
import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "model", content: data.content }]);
      }
    } catch (error) {
      console.error("Failed to text Gemini", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 🎯 ফ্লোটিং চ্যাট বাটন */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all flex items-center justify-center scale-100 hover:scale-105"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* 🎯 চ্যাট উইন্ডো ইন্টারফেস */}
      {isOpen && (
        <div className="bg-white border border-slate-200 w-80 md:w-96 h-[450px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* হেডার */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm">MedTracker AI Assistant</h3>
              <p className="text-xs text-blue-100">Ask me anything</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded-lg transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* মেসেজ এরিয়া */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-sm mt-10">
                👋 Hello! How can I help you today?
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-none whitespace-pre-line"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* ইনপুট ফর্ম */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}