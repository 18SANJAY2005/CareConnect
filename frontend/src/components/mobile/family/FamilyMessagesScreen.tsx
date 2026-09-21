import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { Elder, User } from '../../../types';
import type { ChatMessage } from '../../../types/phaseC';

interface FamilyMessagesScreenProps {
  elder: Elder;
  currentUser?: User | null;
}

export const FamilyMessagesScreen: React.FC<FamilyMessagesScreenProps> = ({ elder, currentUser }) => {
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
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Send a message to your assigned Care Coordinator for any assistance or schedule updates.
          </div>
        ) : (
          messages.map((m) => {
            const isSystem = m.senderRole === 'SYSTEM';
            const isMe =
              !isSystem &&
              ((currentUser && m.senderId === currentUser.id) ||
                m.senderRole === 'FAMILY' ||
                m.senderRole === 'FAMILY_SPONSOR' ||
                m.senderRole === 'CLIENT' ||
                m.senderRole === 'SPONSOR');

            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[10px] font-medium text-center max-w-[85%]">
                    {m.content}
                  </div>
                </div>
              );
            }

            if (isMe) {
              // User's own messages -> ALIGNED RIGHT
              return (
                <div key={m.id} className="flex flex-col items-end my-1">
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-xs bg-primary text-white text-xs leading-relaxed shadow-sm">
                    <p>{m.content}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 mr-1">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            }

            // Other participant (Caregiver, Care Coordinator) -> ALIGNED LEFT
            return (
              <div key={m.id} className="flex flex-col items-start my-1">
                <div className="flex items-center gap-1.5 mb-1 ml-1 text-[11px] font-bold text-slate-700">
                  <span>
                    {m.senderName ||
                      (m.senderRole === 'COORDINATOR' ? 'Care Coordinator' : 'Attendant')}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200/60 font-semibold">
                    {m.senderRole === 'COORDINATOR' ? 'Desk' : 'Caregiver'}
                  </span>
                </div>
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-xs bg-white text-slate-800 border border-slate-200 text-xs leading-relaxed shadow-sm">
                  <p>{m.content}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 ml-1">
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
