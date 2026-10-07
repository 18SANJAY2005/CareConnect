import React, { useState } from "react";
import { User, Users, ArrowRight, ArrowLeft } from "lucide-react";

interface MobileOnboardingWhoProps {
  onSelect: (recipient: "ME" | "SOMEONE_ELSE") => void;
  onBack: () => void;
  initialValue?: "ME" | "SOMEONE_ELSE";
  onLogout?: () => void;
  isMyselfActive?: boolean;
}

export const MobileOnboardingWho: React.FC<MobileOnboardingWhoProps> = ({
  onSelect,
  onBack,
  initialValue,
  onLogout,
  isMyselfActive,
}) => {
  const [recipient, setRecipient] = useState<"ME" | "SOMEONE_ELSE" | null>(
    initialValue || null,
  );

  return (
    <div className="flex flex-1 flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="-ml-2 rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
            Step 1 of 4
          </span>
          <div className="w-12" />{/* Spacer to keep Step centered */}
        </div>

        <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-900">
          Who is care for?
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Tell us who will receive care so we can tailor the next steps.
        </p>
      </div>

      <div className="my-auto space-y-3.5 py-6">
        {[
          {
            id: "ME",
            title: "Myself",
            subtitle: "Care for me",
            description:
              "I am looking for home support or companionship for myself.",
            icon: User,
          },
          {
            id: "SOMEONE_ELSE",
            title: "Someone else",
            subtitle: "Care for a loved one",
            description:
              "For a parent, spouse, grandparent, or family member who needs support.",
            icon: Users,
          },
        ].map(({ id, title, subtitle, description, icon: Icon }) => {
          const isSelected = recipient === id;
          const isDisabled = id === "ME" && isMyselfActive;

          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              onClick={() => setRecipient(id as "ME" | "SOMEONE_ELSE")}
              className={`w-full rounded-[28px] border-2 p-5 text-left transition-all duration-200 ${
                isDisabled 
                  ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                  : isSelected
                    ? "border-primary bg-teal-50/60 shadow-[0_12px_24px_rgba(0,67,64,0.08)] ring-2 ring-primary/15 active:scale-[0.98]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                    isSelected
                      ? "bg-primary text-white"
                      : isDisabled
                      ? "bg-slate-200 text-slate-400"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                <div className="flex-1">
                  <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 flex items-center gap-2">
                    {title}
                    {isDisabled && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                        Added
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
                    {subtitle}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-500">
                    {description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <button
          onClick={() => {
            if (recipient) onSelect(recipient);
          }}
          disabled={!recipient}
          className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white shadow-md transition hover:bg-primary-hover disabled:opacity-50 active:scale-[0.98]"
        >
          <span>Continue</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

