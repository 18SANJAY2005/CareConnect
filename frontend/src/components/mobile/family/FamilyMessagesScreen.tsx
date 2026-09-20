import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { Elder } from '../../../types';
import type { ChatMessage } from '../../../types/phaseC';

interface FamilyMessagesScreenProps {
  elder: Elder;
}

export const FamilyMessagesScreen: React.FC<FamilyMessagesScreenProps> = ({ elder }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const list = await api.getChatMessages(elder.id, 'FAMILY_COORDINATOR');
      setMessages(list || []);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
  }, [elder.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const newMsg = await api.sendChatMessage({
        elderId: elder.id,
        content,
        channel: 'FAMILY_COORDINATOR',
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-120px)] animate-fadeIn text-slate-900 px-4 py-3">
      {/* Header Banner */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 shrink-0 mb-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900">Care Coordinator Desk</div>
          <div className="text-[10px] text-emerald-600 font-semibold">● Active • Typical reply in &lt; 5 mins</div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Send a message to your assigned Care Coordinator for any assistance or schedule updates.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderRole === 'FAMILY' || m.senderRole === 'SPONSOR';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p>{m.content}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Field */}
      <form onSubmit={handleSend} className="pt-2 pb-16 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask care coordinator a question..."
          className="flex-1 h-12 px-4 bg-white rounded-2xl border border-slate-300 text-xs text-slate-900 focus:border-primary shadow-sm"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-12 h-12 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition shrink-0 shadow-sm"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
