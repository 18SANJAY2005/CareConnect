import React from 'react';
import {
  User,
  MapPin,
  Phone,
  ShieldCheck,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { Elder } from '../../../types';

interface FamilyMyCareScreenProps {
  elder: Elder;
  onEditProfile: () => void;
}

export const FamilyMyCareScreen: React.FC<FamilyMyCareScreenProps> = ({
  elder,
  onEditProfile,
}) => {
  return (
    <div className="space-y-4 px-4 py-4 pb-20 animate-fadeIn text-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-slate-900">My Care Plan</h2>
          <p className="text-xs text-slate-500">Active services & profile overview</p>
        </div>
        <button
          onClick={onEditProfile}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
        >
          <Edit2 className="w-3 h-3" />
          <span>Edit</span>
        </button>
      </div>

      {/* Active Service Plan */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Standard 12-Hour Day Care</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Active & Supervised</div>
            </div>
          </div>
          <span className="text-xs font-extrabold text-slate-800">₹18,000 / mo</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>08:00 AM – 08:00 PM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>30-Day Cycle</span>
          </div>
        </div>
      </div>

      {/* Elder Profile Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          <span>Elder Health Profile</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Full Name</span>
            <span className="font-bold text-slate-800">{elder.name}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Age & Gender</span>
            <span className="font-bold text-slate-800">
              {elder.age} yrs • {elder.gender}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Mobility Level</span>
            <span className="font-bold text-slate-800">
              {elder.mobilityLevel || 'Assisted Walking'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Primary Language</span>
            <span className="font-bold text-slate-800">
              {elder.primaryLanguage || 'Tamil, English'}
            </span>
          </div>
        </div>

        {/* Medical conditions list */}
        {elder.medicalConditions && elder.medicalConditions.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 block mb-1">Health Observations</span>
            <div className="flex flex-wrap gap-1">
              {elder.medicalConditions.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-semibold border border-teal-100"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verified Location */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>Service Location</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed">
          {elder.location?.addressLine1 || 'Elder Residence'}, {elder.location?.locality || 'Corridor'}
          <br />
          PIN: <span className="font-mono font-bold">{elder.location?.postalCode || '600020'}</span>
        </div>
        <div className="pt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Within active primary care corridor</span>
        </div>
      </div>

      {/* Care Coordination Contact */}
      <div className="p-4 rounded-3xl bg-teal-50 border border-teal-200/80 text-teal-900 space-y-2.5">
        <div className="text-xs font-bold">24/7 Care Coordinator Desk</div>
        <div className="text-xs text-teal-800/90 leading-relaxed">
          Need a shift timing change, replacement, or clinical consultation?
        </div>
        <a
          href="tel:+914448552200"
          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call Care Manager (+91 44 4855 2200)</span>
        </a>
      </div>
    </div>
  );
};
