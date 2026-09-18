import React from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { ShieldCheck, MapPin, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentStep } = useOnboarding();

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-teal-50 to-white pt-20 pb-16 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/50 text-teal-800 text-sm font-medium mb-6">
          <MapPin className="w-4 h-4" />
          <span>Now operating exclusively across Chennai</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          Compassionate Elder Care, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
            Professionally Managed.
          </span>
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          CareConnect provides verified clinical attendants, real-time geofenced tracking, and dedicated care corridors to ensure your loved ones are always in safe hands.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => setCurrentStep('AUTH')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">Why Choose CareConnect?</h2>
          <p className="mt-4 text-slate-500">A modern approach to traditional elder care.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Attendants</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Every caregiver undergoes strict multi-step verification and continuous clinical training before joining our Chennai network.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Geofenced Check-ins</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Our mobile app ensures caregivers only check in when they are physically at the elder's verified residence.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Active Monitoring</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Track daily tasks, vital signs, and care incidents in real-time through the family sponsor dashboard.
            </p>
          </div>
        </div>
      </section>
      
      {/* Trust Badges */}
      <section className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> DPDP Act 2023 Compliant
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ISO 27001 Security Standard
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure Cloud Infrastructure
          </div>
        </div>
      </section>
    </div>
  );
};

