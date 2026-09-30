import React from "react";
import { CareConnectLogo } from "../common/CareConnectLogo";
import { AlertCircle, ChevronDown } from "lucide-react";
import type { Elder } from "../../types";

interface MobileTopBarProps {
  activePortal?: "FAMILY" | "CAREGIVER" | "OPERATIONS";
  elders?: Elder[];
  activeElder?: Elder | null;
  onSelectElder?: (elderId: string) => void;
  onOpenSos: () => void;
  onAddElder?: () => void;
  title?: string;
  userName?: string;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  activePortal = "FAMILY",
  elders = [],
  activeElder,
  onSelectElder,
  onAddElder,
  onOpenSos,
  title,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl safe-top shadow-sm">
      <div className="flex h-[66px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <CareConnectLogo size="sm" showWordmark />
          {title && (
            <span className="max-w-[110px] truncate border-l border-slate-200 pl-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activePortal === "FAMILY" && onAddElder && (
            <button
              onClick={onAddElder}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-50 text-primary border border-teal-100 shadow-sm transition hover:bg-teal-100"
              title="Add New Care Request"
              aria-label="Add New Care Request"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
          )}
          {activePortal === "FAMILY" && elders.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <span className="max-w-[80px] truncate">
                  {activeElder?.name || "Elder"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Select Elder
                  </div>
                  {elders.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        onSelectElder?.(e.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[11px] transition ${
                        activeElder?.id === e.id
                          ? "bg-teal-50 font-bold text-primary"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{e.name}</span>
                      {activeElder?.id === e.id && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onOpenSos}
            aria-label="Emergency SOS"
            className="flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm transition active:scale-95 hover:bg-rose-700"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};

