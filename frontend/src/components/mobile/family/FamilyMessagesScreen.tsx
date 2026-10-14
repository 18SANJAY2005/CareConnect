import React, { useState, useEffect, useRef } from "react";
import { Send, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "../../../services/api";
import type { Elder, User } from "../../../types";
import type { ChatMessage } from "../../../types/phaseC";

interface FamilyMessagesScreenProps {
  elder: Elder;
  currentUser?: User | null;
}

export const FamilyMessagesScreen: React.FC<FamilyMessagesScreenProps> = ({
  elder,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const list = await api.getChatMessages(elder.id, "FAMILY_COORDINATOR");
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const newMsg = await api.sendChatMessage({
        elderId: elder.id,
        content,
        channel: "FAMILY_COORDINATOR",
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-120px)] flex-1 animate-fadeIn flex-col px-3.5 sm:px-4 py-3 text-slate-900">
      <div className="mb-3 flex shrink-0 items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            Care coordinator desk
          </div>
          <div className="text-[10px] font-semibold text-emerald-600 truncate">
            ● Active • Typical reply in under 5 mins
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-1 pr-1">
        {messages.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center text-xs leading-relaxed text-slate-500">
            Send a message to your assigned care coordinator for assistance or
            schedule updates.
          </div>
        ) : (
          messages.map((m) => {
            const isSystem = m.senderRole === "SYSTEM";
            const isMe =
              !isSystem &&
              ((currentUser && m.senderId === currentUser.id) ||
                m.senderRole === "FAMILY" ||
                m.senderRole === "FAMILY_SPONSOR" ||
                m.senderRole === "CLIENT" ||
                m.senderRole === "SPONSOR");

            if (isSystem) {
              return (
                <div key={m.id} className="my-2 flex justify-center">
                  <div className="max-w-[90%] rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-center text-[10px] font-medium text-slate-600 break-words">
                    {m.content}
                  </div>
                </div>
              );
            }

            if (isMe) {
              return (
                <div key={m.id} className="flex flex-col items-end my-1">
                  <div className="max-w-[85%] sm:max-w-[78%] rounded-[22px] rounded-br-md bg-primary px-3.5 sm:px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm break-words">
                    <p className="break-words">{m.content}</p>
                  </div>
                  <span className="mt-1 mr-1 text-[9px] text-slate-400">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            }

            return (
              <div key={m.id} className="my-1 flex flex-col items-start">
                <div className="mb-1 ml-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <span className="truncate max-w-[150px]">
                    {m.senderName ||
                      (m.senderRole === "COORDINATOR"
                        ? "Care Coordinator"
                        : "Attendant")}
                  </span>
                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700 border border-teal-200/60 shrink-0">
                    {m.senderRole === "COORDINATOR" ? "Desk" : "Caregiver"}
                  </span>
                </div>
                <div className="max-w-[85%] sm:max-w-[78%] rounded-[22px] rounded-bl-md border border-slate-200 bg-white px-3.5 sm:px-4 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm break-words">
                  <p className="break-words">{m.content}</p>
                </div>
                <span className="mt-1 ml-1 text-[9px] text-slate-400">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-center gap-2 pb-safe-nav pt-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask care coordinator a question..."
          className="h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm focus:border-primary"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-40"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
};
