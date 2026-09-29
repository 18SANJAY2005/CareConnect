import React, { useState } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Thermometer, 
  Droplet, 
  Camera, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  UploadCloud,
  FileText
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { ShiftDetails } from '../../types';

interface VitalsAndLogsScreenProps {
  shiftDetails: ShiftDetails | null;
}

export const VitalsAndLogsScreen: React.FC<VitalsAndLogsScreenProps> = ({ shiftDetails }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'VITALS' | 'PHOTO' | 'NOTES'>('VITALS');

  // Vitals form state
  const [systolicBp, setSystolicBp] = useState<string>('120');
  const [diastolicBp, setDiastolicBp] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');
  const [bloodGlucose, setBloodGlucose] = useState<string>('105');
  const [glucoseContext, setGlucoseContext] = useState<string>('FASTING');
  const [temperature, setTemperature] = useState<string>('36.8');
  const [vitalsNotes, setVitalsNotes] = useState<string>('');

  // Photo update state
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80'
  );
  const [photoCategory, setPhotoCategory] = useState<string>('MEAL');
  const [photoCaption, setPhotoCaption] = useState<string>(
    'Elder enjoying fresh hot idlis and warm sambar.'
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Care note state
  const [careNote, setCareNote] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLanguage, setSpeechLanguage] = useState<'ta-IN' | 'te-IN' | 'en-IN'>('ta-IN');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // Status feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const elderId = shiftDetails?.elder?.id;
  const shiftId = shiftDetails?.shift?.id;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
          setSuccessMsg('Photo selected from device. Ready to upload.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elderId) return;

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const sys = systolicBp ? parseInt(systolicBp, 10) : undefined;
    const dia = diastolicBp ? parseInt(diastolicBp, 10) : undefined;

    if (sys && dia && sys <= dia) {
      setErrorMsg('Systolic blood pressure must be greater than Diastolic blood pressure.');
      setLoading(false);
      return;
    }

    try {
      const reading = await caregiverApi.recordVitals({
        elderId,
        shiftId,
        systolicBp: sys,
        diastolicBp: dia,
        pulse: pulse ? parseInt(pulse, 10) : undefined,
        bloodGlucose: bloodGlucose ? parseFloat(bloodGlucose) : undefined,
        glucoseContext,
        temperatureCelsius: temperature ? parseFloat(temperature) : undefined,
        notes: vitalsNotes.trim() || undefined,
        source: 'MANUAL',
      });

      if (reading.isAbnormal) {
        setSuccessMsg(
          `Vitals recorded with ${reading.alertSeverity} operational flag. Operations manager alerted.`
        );
      } else {
        setSuccessMsg('Vitals recorded successfully! All parameters within normal ranges.');
      }
      setVitalsNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record vitals.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elderId || !photoUrl) return;

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await caregiverApi.uploadMedia({
        elderId,
        shiftId,
        mediaUrl: photoUrl,
        mediaType: 'PHOTO',
        category: photoCategory,
        caption: photoCaption,
      });

      setSuccessMsg('Daily photo update uploaded and shared with family sponsor timeline!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload photo update.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorMsg('Voice recognition not supported in this browser. Please type your notes below.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCareNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        setIsListening(false);
        if (err.error === 'not-allowed') {
          setErrorMsg('Microphone access denied. Please allow microphone permissions in browser.');
        } else {
          setErrorMsg('Speech recognition error. Please try again or type directly.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setErrorMsg('Could not start microphone recording. Please type notes directly.');
    }
  };

  const handleSaveCareNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careNote.trim() || !elderId) return;

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Save voice note as vitals/shift care note
      await caregiverApi.recordVitals({
        elderId,
        shiftId,
        notes: `Caregiver Log: ${careNote.trim()}`,
        source: 'MANUAL',
      });
      setSuccessMsg('Care observation note saved to patient record!');
      setCareNote('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save care note.');
    } finally {
      setLoading(false);
    }
  };

  if (!elderId) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12 text-slate-500">
        <HeartPulse className="w-8 h-8 text-primary mx-auto mb-2" />
        <h3 className="font-bold text-sm text-slate-800">No Patient Selected</h3>
        <p className="text-xs mt-1">Please ensure an active shift is started on the Today screen.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('VITALS');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'VITALS'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>{t('vitalsTitle').split(' ')[0]}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('PHOTO');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'PHOTO'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{t('photoUpdate').split(' ')[0]}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('NOTES');
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'NOTES'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('careNotes').split(' ')[0]}</span>
        </button>
      </div>

      {/* Status Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* TAB 1: VITALS FORM */}
      {activeTab === 'VITALS' && (
        <form onSubmit={handleRecordVitals} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{t('vitalsTitle')}</h3>
              <p className="text-[11px] text-slate-500">Record clinical monitoring parameters</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Non-Diagnostic
            </span>
          </div>

          {/* Blood Pressure Inputs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('bloodPressure')} (mmHg)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold">{t('systolic')}</span>
                <input
                  type="number"
                  min="70"
                  max="260"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(e.target.value)}
                  placeholder="120"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold">{t('diastolic')}</span>
                <input
                  type="number"
                  min="40"
                  max="150"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(e.target.value)}
                  placeholder="80"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Pulse & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('pulse')}
              </label>
              <input
                type="number"
                min="40"
                max="220"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('temperature')}
              </label>
              <input
                type="number"
                step="0.1"
                min="34.0"
                max="43.0"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.8"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Blood Glucose & Context */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('bloodSugar')}
              </label>
              <input
                type="number"
                step="1"
                min="30"
                max="600"
                value={bloodGlucose}
                onChange={(e) => setBloodGlucose(e.target.value)}
                placeholder="105"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Context</label>
              <select
                value={glucoseContext}
                onChange={(e) => setGlucoseContext(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-primary"
              >
                <option value="FASTING">{t('fasting')}</option>
                <option value="POST_PRANDIAL">{t('postMeal')}</option>
                <option value="RANDOM">{t('random')}</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Physiological / Rest Notes
            </label>
            <input
              type="text"
              value={vitalsNotes}
              onChange={(e) => setVitalsNotes(e.target.value)}
              placeholder="e.g. Patient rested seated 5 mins prior."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
            <span>{t('recordVitals')}</span>
          </button>
        </form>
      )}

      {/* TAB 2: PHOTO UPDATE */}
      {activeTab === 'PHOTO' && (
        <form onSubmit={handleUploadPhoto} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">{t('photoUpdate')}</h3>
            <p className="text-[11px] text-slate-500">
              Family remote reassurance: upload daily meal or activity picture
            </p>
          </div>

          {/* Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Care update" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-slate-400" />
            )}
          </div>

          {/* Photo Capture / Select Buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoFileChange}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-3 min-h-[48px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 flex items-center justify-center gap-1.5 touch-action-manipulation"
            >
              <Camera className="w-4 h-4 text-teal-700" />
              <span>Camera Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute('capture', 'environment');
                }
              }}
              className="py-3 px-3 min-h-[48px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 touch-action-manipulation"
            >
              <span>Choose File</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={photoCategory}
              onChange={(e) => setPhotoCategory(e.target.value)}
              className="w-full p-2.5 min-h-[44px] border border-slate-300 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="MEAL">Meal & Hydration</option>
              <option value="MOBILITY">Physiotherapy / Walk</option>
              <option value="REST">Rest & Relaxation</option>
              <option value="GENERAL">General Welfare</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Caption / Message</label>
            <input
              type="text"
              required
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Describe what elder is doing for family..."
              className="w-full p-3 min-h-[46px] border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 min-h-[52px] bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>Upload Daily Photo to Family Feed</span>
          </button>
        </form>
      )}

      {/* TAB 3: CARE VOICE NOTE */}
      {activeTab === 'NOTES' && (
        <form onSubmit={handleSaveCareNote} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{t('careNotes')}</h3>
              <p className="text-[11px] text-slate-500">Voice or text care observation</p>
            </div>
            <button
              type="button"
              onClick={handleSpeechRecognition}
              aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
              className={`p-3 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full shadow-sm transition-all touch-action-manipulation ${
                isListening
                  ? 'bg-red-500 text-white animate-bounce'
                  : 'bg-teal-50 text-primary border border-teal-200 hover:bg-teal-100'
              }`}
              title="Dictate note"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-semibold text-slate-600">Voice Language:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSpeechLanguage('ta-IN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] touch-action-manipulation ${
                  speechLanguage === 'ta-IN' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('te-IN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] touch-action-manipulation ${
                  speechLanguage === 'te-IN' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('en-IN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] touch-action-manipulation ${
                  speechLanguage === 'en-IN' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {!speechSupported && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              Note: Speech recognition is not available in this browser. Please type observations directly in the box below.
            </div>
          )}

          {isListening && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Listening in {speechLanguage === 'ta-IN' ? 'Tamil' : speechLanguage === 'te-IN' ? 'Telugu' : 'English'}... speak clearly.</span>
            </div>
          )}

          <div>
            <textarea
              required
              rows={4}
              value={careNote}
              onChange={(e) => setCareNote(e.target.value)}
              placeholder="Tap microphone above to dictate, or type caregiver observations..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !careNote.trim()}
            className="w-full py-3.5 px-4 min-h-[52px] bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Save Observation Note</span>
          </button>
        </form>
      )}
    </div>
  );
};
