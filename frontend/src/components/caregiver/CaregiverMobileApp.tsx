import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  HeartPulse, 
  Utensils, 
  Camera, 
  Mic, 
  Wifi, 
  WifiOff, 
  UserCheck, 
  Check, 
  ChevronRight, 
  PhoneCall
} from 'lucide-react';
import { api } from '../../services/api';
import { offlineQueue } from '../../services/offlineQueue';
import type { ShiftDetails, CareTask, TimeOfDay } from '../../types/phaseC';

// Vernacular Localization Dictionary
const I18N = {
  ta: {
    title: 'பராமரிப்பாளர் பணித்தளம்',
    activeDuty: 'பணியில் உள்ளார்',
    offDuty: 'பணியில் இல்லை',
    shift: 'இன்றைய பணி ஒதுக்கீடு',
    patient: 'முதியவர் விவரம்',
    checkIn: 'பணியைத் தொடங்கு (Check-In)',
    checkOut: 'பணியை முடி (Check-Out)',
    locVerified: 'முகவரி உறுதி செய்யப்பட்டது',
    locOutOfRange: 'தூரம் அதிகம் (Out of Range)',
    householdOtp: 'குடும்ப OTP மூலம் உறுதிசெய்',
    supervisorOverride: 'மேற்பார்வையாளர் அனுமதி கோரு',
    tasks: 'தினசரி பராமரிப்பு பணிகள்',
    morning: 'காலை',
    afternoon: 'மதியம்',
    evening: 'மாலை',
    night: 'இரவு',
    vitals: 'உடல்நல அளவீடுகள் (Vitals)',
    recordVitals: 'அளவீடுகளைப் பதிவு செய்',
    mediaUpload: 'தினசரி புகைப்படம் பதிவேற்று',
    sosButton: 'அவசர உதவி (SOS)',
    sosConfirm: 'அவசர உதவி கோர உறுதிப்படுத்துகிறீர்களா?',
    waterIntake: 'தண்ணீர் பருகியது (+250 மிலி)',
    medication: 'மருந்து உட்கொள்ளப்பட்டது',
    walking: 'நடைப்பயிற்சி',
    reposition: 'படுக்கை நிலை மாற்றம்',
    notes: 'பராமரிப்பு குறிப்பு',
    voicePrompt: 'பேசிப் பதிவு செய்க...',
    synced: 'இணைக்கப்பட்டது',
    pending: 'காத்திருக்கிறது',
    simOffline: 'இணையமின்மையைச் சோதி',
    simOnline: 'இணையத்தை மீட்டமை'
  },
  en: {
    title: 'Caregiver Shift Portal',
    activeDuty: 'On Duty',
    offDuty: 'Off Duty',
    shift: "Today's Assignment",
    patient: 'Elder Profile',
    checkIn: 'Check In (Start Shift)',
    checkOut: 'Check Out (End Shift)',
    locVerified: 'Location Verified (Within Geofence)',
    locOutOfRange: 'Out of Range Warning',
    householdOtp: 'Verify with Family OTP',
    supervisorOverride: 'Request Supervisor Approval',
    tasks: 'Daily Care Checklist',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    vitals: 'Health Vitals',
    recordVitals: 'Record Vitals',
    mediaUpload: 'Upload Photo Update',
    sosButton: 'Emergency SOS',
    sosConfirm: 'Are you sure you want to trigger emergency SOS?',
    waterIntake: 'Water Intake (+250ml)',
    medication: 'Medication Administered',
    walking: 'Mobility Walk',
    reposition: 'Posture Repositioned',
    notes: 'Care Notes',
    voicePrompt: 'Tap to speak...',
    synced: 'Synced',
    pending: 'Pending Sync',
    simOffline: 'Simulate Offline',
    simOnline: 'Go Online'
  },
  te: {
    title: 'సంరక్షకుల విధి వేదిక',
    activeDuty: 'డ్యూటీలో ఉన్నారు',
    offDuty: 'డ్యూటీ ముగిసింది',
    shift: 'నేటి అసైన్‌మెంట్',
    patient: 'వృద్ధుల వివరాలు',
    checkIn: 'డ్యూటీ ప్రారంభించు (Check-In)',
    checkOut: 'డ్యూటీ ముగించు (Check-Out)',
    locVerified: 'స్థానం ధృవీకరించబడింది',
    locOutOfRange: 'పరిధి వెలుపల ఉంది',
    householdOtp: 'కుటుంబ OTP తో ధృవీకరించు',
    supervisorOverride: 'సూపర్‌వైజర్ అనుమతి కోరండి',
    tasks: 'రోజువారీ సంరక్షణ పనులు',
    morning: 'ఉదయం',
    afternoon: 'మధ్యాహ్నం',
    evening: 'సాయంత్రం',
    night: 'రాత్రి',
    vitals: 'ఆరోగ్య సూచికలు',
    recordVitals: 'సూచికలను నమోదు చేయండి',
    mediaUpload: 'ఫోటో అప్‌లోడ్ చేయండి',
    sosButton: 'అత్యవసర సహాయం (SOS)',
    sosConfirm: 'అత్యవసర SOS ప్రారంభించాలా?',
    waterIntake: 'నీరు (+250మి.లీ)',
    medication: 'మందులు ఇవ్వబడ్డాయి',
    walking: 'నడక వ్యాయామం',
    reposition: 'భంగిమ మార్పు',
    notes: 'సంరక్షణ నోట్స్',
    voicePrompt: 'మాట్లాడటానికి నొక్కండి...',
    synced: 'సింక్ చేయబడింది',
    pending: 'వేచి ఉంది',
    simOffline: 'ఆఫ్‌లైన్ పరీక్షించండి',
    simOnline: 'ఆన్‌లైన్ వెళ్ళండి'
  }
};

export const CaregiverMobileApp: React.FC = () => {
  const [lang, setLang] = useState<'ta' | 'en' | 'te'>('ta');
  const t = I18N[lang];

  const [shiftData, setShiftData] = useState<ShiftDetails | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [selectedTab, setSelectedTab] = useState<TimeOfDay>('MORNING');
  const [, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Modals
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('654321');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);

  // Vitals form
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');
  const [glucose, setGlucose] = useState<string>('110');
  const [glucoseContext, setGlucoseContext] = useState<string>('RANDOM');
  const [temperature, setTemperature] = useState<string>('36.8');
  const [vitalsNotes, setVitalsNotes] = useState<string>('');

  // Media form
  const [mediaCaption, setMediaCaption] = useState<string>('Morning breakfast and medicines completed.');
  const [mediaUrl, setMediaUrl] = useState<string>('https://images.unsplash.com/photo-1576765608535-5f04d1e3f289');

  // Offline queue state
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(offlineQueue.getSimulatedOffline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(offlineQueue.getPendingCount());

  // Voice speech state
  const [isListening, setIsListening] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const details = await api.getCurrentCaregiverShift();
      setShiftData(details);
      if (details?.shift?.id) {
        const shiftTasks = await api.getShiftTasks(details.shift.id);
        setTasks(shiftTasks);
      }
    } catch (err: any) {
      setStatusMessage('Unable to load shift details: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to offline queue changes
    const unsubscribe = offlineQueue.subscribe(() => {
      setPendingSyncCount(offlineQueue.getPendingCount());
      setIsSimulatedOffline(offlineQueue.getSimulatedOffline());
    });

    return () => unsubscribe();
  }, []);

  const handleToggleOffline = async () => {
    const nextState = !isSimulatedOffline;
    offlineQueue.setSimulatedOffline(nextState);
    setIsSimulatedOffline(nextState);
    if (!nextState) {
      // Reconnected, trigger auto-sync
      setStatusMessage('Reconnected to CareConnect server! Syncing pending activities...');
      const res = await api.syncPendingOfflineQueue();
      setStatusMessage(`Synced ${res.processed} queued items.`);
      loadData();
    }
  };

  const handleCheckIn = async (overrideCode?: string) => {
    if (!shiftData?.shift?.id) return;
    setStatusMessage('Checking proximity to elder residence...');
    try {
      // Coordinates near Adyar, Chennai (13.0013, 80.2566)
      const res = await api.checkInShift(shiftData.shift.id, {
        latitude: 13.0013,
        longitude: 80.2566,
        overrideCode
      });
      setStatusMessage(res.message);
      loadData();
      setIsOtpModalOpen(false);
    } catch (err: any) {
      setStatusMessage(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!shiftData?.shift?.id) return;
    try {
      const res = await api.checkOutShift(shiftData.shift.id, {
        summary: checkOutNotes || 'Completed standard care activities, vitals, and meals.'
      });
      setStatusMessage(res.message);
      setIsCheckOutModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage(err.message || 'Check-out failed');
    }
  };

  const handleTaskToggle = async (task: CareTask) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await api.updateCareTask(task.id, {
        status: newStatus,
        details: task.details,
        notes: task.notes
      });
      if (res.isQueuedOffline) {
        setStatusMessage(res.message);
      }
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      setStatusMessage('Failed to update task');
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftData?.elder?.id) return;
    try {
      const res = await api.recordVitalReading({
        elderId: shiftData.elder.id,
        shiftId: shiftData.shift?.id,
        systolicBp: systolic ? parseInt(systolic) : null,
        diastolicBp: diastolic ? parseInt(diastolic) : null,
        pulse: pulse ? parseInt(pulse) : null,
        bloodGlucose: glucose ? parseFloat(glucose) : null,
        glucoseContext,
        temperatureCelsius: temperature ? parseFloat(temperature) : null,
        notes: vitalsNotes
      });
      setIsVitalsModalOpen(false);
      setStatusMessage(
        res.isAbnormal
          ? `⚠️ Measurement Alert: ${res.alertMessage}`
          : 'Vitals recorded and verified successfully.'
      );
    } catch (err: any) {
      setStatusMessage('Vitals error: ' + (err.message || 'Invalid reading'));
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftData?.elder?.id) return;
    try {
      await api.uploadCareMedia({
        elderId: shiftData.elder.id,
        shiftId: shiftData.shift?.id,
        mediaUrl,
        category: 'MEAL',
        caption: mediaCaption
      });
      setIsMediaModalOpen(false);
      setStatusMessage('Daily photo update uploaded for family sponsor view.');
    } catch (err: any) {
      setStatusMessage('Media upload error: ' + err.message);
    }
  };

  const handleTriggerSos = async () => {
    if (!shiftData?.elder?.id) return;
    try {
      await api.triggerSos({
        elderId: shiftData.elder.id,
        shiftId: shiftData.shift?.id,
        latitude: 13.0012,
        longitude: 80.2565,
        notes: 'Caregiver triggered emergency SOS from mobile app.'
      });
      setIsSosModalOpen(false);
      setStatusMessage('🚨 EMERGENCY P1 INCIDENT CREATED! Operations desk alerted.');
    } catch (err: any) {
      setStatusMessage('Failed to trigger SOS: ' + err.message);
    }
  };

  // Voice speech simulation / Web Speech API
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatusMessage('Voice recognition note: "Elder had breakfast at 8:30 AM and took BP tablet."');
      setVitalsNotes('Elder had breakfast at 8:30 AM and took BP tablet.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVitalsNotes(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } catch {
      setIsListening(false);
    }
  };

  const currentShift = shiftData?.shift;
  const elder = shiftData?.elder;
  const attendance = shiftData?.latestAttendance;
  const isOnDuty = currentShift?.status === 'ACTIVE' || currentShift?.status === 'CHECKED_IN';
  const filteredTasks = tasks.filter(t => t.timeOfDay === selectedTab);

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 border-x border-slate-200 shadow-2xl flex flex-col font-sans pb-24 text-slate-900">
      
      {/* Sticky Top App Bar */}
      <header className="sticky top-0 z-30 bg-primary text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-teal-200 font-bold block">
            CareConnect Chennai
          </span>
          <h1 className="text-base font-bold tracking-tight text-white">{t.title}</h1>
        </div>

        {/* Language Selector Pill */}
        <div className="flex items-center bg-primary-container/80 rounded-full p-0.5 border border-teal-500/30">
          {(['ta', 'en', 'te'] as const).map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`px-2.5 py-1 text-xs font-bold rounded-full transition ${
                lang === code ? 'bg-white text-primary shadow-sm' : 'text-teal-100 hover:text-white'
              }`}
            >
              {code === 'ta' ? 'தமிழ்' : code === 'te' ? 'తెలుగు' : 'ENG'}
            </button>
          ))}
        </div>
      </header>

      {/* Network & Offline Status Banner */}
      <div className={`px-4 py-1.5 flex items-center justify-between text-xs font-semibold ${
        isSimulatedOffline ? 'bg-amber-500 text-slate-950' : 'bg-emerald-800 text-white'
      }`}>
        <div className="flex items-center gap-1.5">
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{isSimulatedOffline ? 'Offline Mode (Local Storage)' : 'Network Connected'}</span>
          {pendingSyncCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px]">
              {pendingSyncCount} {t.pending}
            </span>
          )}
        </div>
        <button
          onClick={handleToggleOffline}
          className="text-[11px] underline font-bold tracking-wide hover:opacity-80"
        >
          {isSimulatedOffline ? t.simOnline : t.simOffline}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="p-4 space-y-4 flex-1">
        
        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl text-teal-900 text-xs font-medium flex items-start justify-between gap-2 shadow-sm">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage('')} className="text-teal-700 font-bold">✕</button>
          </div>
        )}

        {/* Hero Card: Elder & Shift Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.shift}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
              isOnDuty ? 'bg-emerald-100 text-tertiary border border-emerald-300' : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-tertiary animate-pulse' : 'bg-slate-400'}`} />
              {isOnDuty ? t.activeDuty : t.offDuty}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-primary flex items-center justify-center font-extrabold text-lg shrink-0">
              {elder?.name ? elder.name.charAt(0) : 'K'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {elder?.name || 'Kalyani Ammal'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {elder?.age || 74} yrs • {elder?.gender || 'Female'} • {elder?.primaryLanguage || 'Tamil'}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{elder?.addressLine1 || 'Plot 12, Gandhi Nagar'}, {elder?.locality || 'Adyar'}</span>
              </div>
            </div>
          </div>

          {/* Geofence Status Pill */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            attendance?.verificationStatus === 'VERIFIED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : attendance?.verificationStatus === 'OUT_OF_RANGE'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${attendance?.verificationStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>
                {attendance?.distanceMeters 
                  ? `${Math.round(attendance.distanceMeters)}m away • ${attendance.verificationStatus}`
                  : 'Proximity: 15m away (Adyar corridor)'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary">GPS OK</span>
          </div>

          {/* Primary Action Button (56px minimum touch target) */}
          {!isOnDuty ? (
            <button
              onClick={() => handleCheckIn()}
              className="w-full min-h-[56px] py-3.5 px-4 bg-primary hover:bg-primary-container text-white font-bold text-base rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5" />
              <span>{t.checkIn}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCheckOutModalOpen(true)}
                className="flex-1 min-h-[56px] py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>{t.checkOut}</span>
              </button>
              <button
                onClick={() => setIsOtpModalOpen(true)}
                title={t.householdOtp}
                className="min-h-[56px] px-3 bg-teal-50 hover:bg-teal-100 text-primary border border-teal-200 text-xs font-bold rounded-xl transition"
              >
                OTP
              </button>
            </div>
          )}
        </div>

        {/* Rapid Care Action Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsVitalsModalOpen(true)}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-left hover:border-primary transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 block">{t.vitals}</span>
            <span className="text-[11px] text-slate-500">{t.recordVitals}</span>
          </button>

          <button
            onClick={() => setIsMediaModalOpen(true)}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-left hover:border-secondary transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-secondary flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 block">Photo Update</span>
            <span className="text-[11px] text-slate-500">{t.mediaUpload}</span>
          </button>
        </div>

        {/* Daily Care Checklist (Morning / Afternoon / Evening / Night) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              {t.tasks}
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {tasks.filter(t => t.status === 'COMPLETED').length} / {tasks.length} Completed
            </span>
          </div>

          {/* Time of Day Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
            {(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition text-center ${
                  selectedTab === tab
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'MORNING' ? t.morning : tab === 'AFTERNOON' ? t.afternoon : tab === 'EVENING' ? t.evening : t.night}
              </button>
            ))}
          </div>

          {/* Task Items List */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No tasks scheduled for this period.</p>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskToggle(task)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                      task.status === 'COMPLETED' ? 'bg-tertiary text-white' : 'border-2 border-slate-300'
                    }`}>
                      {task.status === 'COMPLETED' && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <div>
                      <span className={`text-xs font-semibold block ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : ''}`}>
                        {task.taskName}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        {task.category}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Always Visible Red Emergency SOS Button at Bottom */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto p-3 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg z-20 flex items-center gap-2">
        <button
          onClick={() => setIsSosModalOpen(true)}
          className="flex-1 min-h-[56px] px-4 bg-error hover:bg-red-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 tracking-wide uppercase"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <span>{t.sosButton}</span>
        </button>
        <a
          href="tel:108"
          title="Emergency 108"
          className="min-h-[56px] w-[56px] bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95"
        >
          <PhoneCall className="w-5 h-5 text-emerald-400" />
        </a>
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Record Vitals Modal */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                {t.recordVitals}
              </h3>
              <button onClick={() => setIsVitalsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleRecordVitals} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="36.8"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={glucose}
                    onChange={(e) => setGlucose(e.target.value)}
                    placeholder="110"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Context</label>
                  <select
                    value={glucoseContext}
                    onChange={(e) => setGlucoseContext(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="FASTING">Fasting</option>
                    <option value="POST_PRANDIAL">Post-Prandial</option>
                    <option value="RANDOM">Random</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Observation Notes</label>
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className="text-xs font-bold text-primary flex items-center gap-1"
                  >
                    <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
                    <span>Voice Input</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={vitalsNotes}
                  onChange={(e) => setVitalsNotes(e.target.value)}
                  placeholder="e.g. Elder rested 10 mins before reading; feels comfortable."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Readings are stored as care observations for active monitoring, not medical diagnoses.
              </p>

              <button
                type="submit"
                className="w-full min-h-[56px] bg-primary hover:bg-primary-container text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                Save & Verify Vitals
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Photo Update Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-secondary" />
                Upload Care Photo
              </h3>
              <button onClick={() => setIsMediaModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleUploadMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image Preview URL</label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caption for Family</label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[56px] bg-secondary text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                Send Update to Family
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. SOS Emergency Guard Modal */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[400px] rounded-3xl p-6 space-y-4 text-center border-4 border-error shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 text-error flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-error tracking-tight">
              {t.sosButton}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action immediately alerts the CareConnect Operations Desk and notifies family emergency contacts in Chennai.
            </p>

            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-900 font-semibold text-left">
              • Emergency Hotline: 108 (Tamil Nadu Ambulance)<br />
              • Apollo / Kauvery triage guidelines activated.<br />
              • Operations response SLA: &lt; 2 minutes.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsSosModalOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerSos}
                className="flex-1 py-3 px-4 bg-error hover:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
              >
                CONFIRM SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Household OTP Override Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[360px] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Household Verification OTP</h3>
            <p className="text-xs text-slate-600">
              Enter the 6-digit code shown on the family sponsor's app to verify presence when GPS signal is weak.
            </p>
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="654321"
              maxLength={6}
              className="w-full text-center text-xl tracking-widest font-mono font-bold py-2 border border-slate-300 rounded-xl"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsOtpModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckIn(otpInput)}
                className="flex-1 py-2 text-xs font-bold text-white bg-primary rounded-xl"
              >
                Verify OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Check-Out Modal */}
      {isCheckOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[380px] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete Shift Summary</h3>
            <p className="text-xs text-slate-600">
              Provide handover notes before checking out. These will be added to the family care timeline.
            </p>
            <textarea
              rows={3}
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              placeholder="Elder completed daily routine comfortably. All prescribed medications observed."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsCheckOutModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckOut}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl"
              >
                Confirm Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

