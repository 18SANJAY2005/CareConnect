import React from "react";
import { CareConnectLogo } from "./CareConnectLogo";
import { Mail } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand & Purpose */}
        <div className="space-y-3 max-w-md">
          <CareConnectLogo size="md" showWordmark variant="inverted" />
          <p className="text-sm text-slate-400 leading-relaxed">
            Managed elder-care platform designed to connect families,
            caregivers, and care teams.
          </p>
        </div>

        {/* Contact & Copyright */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 text-sm w-full md:w-auto justify-between md:justify-end border-t border-slate-800/80 md:border-0 pt-6 md:pt-0">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">
              Contact
            </span>
            <a
              href="mailto:contact@careconnect.com"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition group"
            >
              <Mail className="w-4 h-4 text-teal-500 group-hover:text-teal-400" />
              <span>contact@careconnect.com</span>
            </a>
          </div>

          <div className="text-slate-500 text-xs sm:text-sm self-start sm:self-center">
            © 2026 CareConnect. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
