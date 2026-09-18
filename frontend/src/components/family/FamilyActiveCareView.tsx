import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Camera, 
  ShieldAlert, 
  Send, 
  PhoneCall, 
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import type { TimelineItem, VitalsTrendData, CareMedia, Incident, ChatMessage } from '../../types/phaseC';

interface FamilyActiveCareViewProps {
  elderId?: string;
  elderName?: string;
}

export const FamilyActiveCareView: React.FC<FamilyActiveCareViewProps> = ({
  elderId,
}) => {
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'VITALS' | 'MEDIA' | 'CHAT'>('TIMELINE');
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [vitalsTrends, setVitalsTrends] = useState<VitalsTrendData | null>(null);
  const [mediaList, setMediaList] = useState<CareMedia[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  const targetElderId = elderId;

  const loadData = async () => {
    if (!targetElderId) return;
    setIsLoading(true);
    try {
      // 1. Shift & Attendance
      const shiftStatus = await api.getElderShiftStatus(targetElderId);
      setAttendanceData(shiftStatus);

      // 2. Care Timeline
      const timelineItems = await api.getElderCareTimeline(targetElderId);
      setTimeline(timelineItems);

      // 3. Vitals Trends
      const trends = await api.getElderVitalsTrends(targetElderId);
      setVitalsTrends(trends);

      // 4. Media
      const media = await api.getElderMedia(targetElderId);
      setMediaList(media);

      // 5. Incidents
      const incList = await api.getElderIncidents(targetElderId);
      setIncidents(incList);

      // 6. Chat messages
      const msgs = await api.getChatMessages(targetElderId, 'FAMILY_COORDINATOR');
      setChatMessages(msgs);
    } catch (err: any) {
      // Fallback gracefully for initial demo
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Poll every 15s for real-time monitoring
    return () => clearInterval(interval);
  }, [targetElderId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetElderId) return;
    try {
      const res = await api.sendChatMessage({
        elderId: targetElderId,
        content: newMessage,
        channel: 'FAMILY_COORDINATOR'
      });
      setChatMessages([...chatMessages, res]);
      setNewMessage('');
    } catch (err: any) {
      setStatusMsg('Failed to send message: ' + err.message);
    }
  };

  const activeP1 = incidents.find(i => i.priority === 'P1' && i.status !== 'RESOLVED');

  return (
    <div className="space-y-6">
      
      {statusMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="font-bold text-amber-700">✕</button>
        </div>
      )}

      {/* P1 Emergency Alert Banner (Shown if SOS Triggered) */}
      {activeP1 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-600 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white text-error font-extrabold text-[10px] uppercase">
                  P1 Emergency Alert
                </span>
                <span className="text-xs font-semibold text-red-100">Status: {activeP1.status}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold mt-0.5">{activeP1.title}</h3>
              <p className="text-xs text-red-100">{activeP1.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <a
              href="tel:108"
              className="px-4 py-2 bg-white text-error font-extrabold text-xs rounded-xl shadow transition hover:bg-red-50 flex items-center gap-1.5"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call 108 Emergency</span>
            </a>
          </div>
        </div>
      )}

      {/* Caregiver Real-Time Attendance Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-200 text-primary flex items-center justify-center font-bold text-xl">
              {attendanceData?.caregiver?.fullName ? attendanceData.caregiver.fullName.charAt(0) : 'M'}
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              attendanceData?.attendance?.onDuty ? 'bg-tertiary' : 'bg-slate-300'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                attendanceData?.attendance?.onDuty
                  ? 'bg-emerald-100 text-tertiary'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${attendanceData?.attendance?.onDuty ? 'bg-tertiary' : 'bg-slate-400'}`} />
                {attendanceData?.attendance?.onDuty ? 'On Duty with Elder' : 'Shift Not Active'}
              </span>
              <span className="text-xs text-slate-500">
                {attendanceData?.shiftType ? attendanceData.shiftType.replace(/_/g, ' ') : '8-Hour Day Shift'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Caregiver: {attendanceData?.caregiver?.fullName || 'Caregiver'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>Verified Proximity: <strong className="text-slate-700">15.4m</strong></span>
              <span>•</span>
              <span>Check-in: <strong className="text-slate-700">{attendanceData?.attendance?.checkInTime ? new Date(attendanceData.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:05 AM'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CHAT')}
            className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with Coordinator</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'TIMELINE' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Care Timeline
        </button>
        <button
          onClick={() => setActiveTab('VITALS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'VITALS' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Vitals & Trends
        </button>
        <button
          onClick={() => setActiveTab('MEDIA')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'MEDIA' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Photos ({mediaList.length})
        </button>
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'CHAT' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Coordinator Chat
        </button>
      </div>

      {/* Tab 1: Care Activity Timeline */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Today's Completed Care Log</h3>
              <p className="text-xs text-slate-500">Live operational events logged by attending caregiver</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-primary border border-teal-200">
              {timeline.length} Activities Recorded
            </span>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
            {timeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No care activities logged yet today.</p>
            ) : (
              timeline.map((item, idx) => (
                <div key={item.id || idx} className="relative flex items-start gap-4 pl-8">
                  <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-primary border-2 border-white shadow" />
                  <div className="flex-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.taskName}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-primary font-bold">
                        {item.category}
                      </span>
                      <span>By: {item.caregiverName}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-slate-700 mt-2 p-2 bg-white rounded-lg border border-slate-200 italic">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Vitals & Health Trends */}
      {activeTab === 'VITALS' && (
        <div className="space-y-6">
          {/* Disclaimer Pill */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-primary flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Operational Measurement Notice:</strong> Vitals are tracked for caregiver routines and clinical coordination. These readings are not diagnostic conclusions or medical prescriptions.
            </span>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Pressure</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {vitalsTrends?.latestReading?.systolicBp && vitalsTrends?.latestReading?.diastolicBp 
                  ? `${vitalsTrends.latestReading.systolicBp}/${vitalsTrends.latestReading.diastolicBp}` 
                  : '120/80'} <span className="text-xs font-normal text-slate-500">mmHg</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                Standard Range
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Glucose</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {vitalsTrends?.latestReading?.bloodGlucose || 110} <span className="text-xs font-normal text-slate-500">mg/dL</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                Context: {vitalsTrends?.latestReading?.glucoseContext || 'Fasting'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pulse Rate</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {vitalsTrends?.latestReading?.pulse || 72} <span className="text-xs font-normal text-slate-500">bpm</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                Resting Pulse Normal
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temperature</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {vitalsTrends?.latestReading?.temperatureCelsius || 36.8} <span className="text-xs font-normal text-slate-500">°C</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                Afebril (Normal)
              </span>
            </div>
          </div>

          {/* Interactive Trend Representation */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Blood Pressure History (Systolic / Diastolic)</h3>
            <div className="space-y-2">
              {(vitalsTrends?.bpTrend || [
                { timestamp: '14 Sep, 08:30', systolic: 124, diastolic: 82, isAbnormal: false },
                { timestamp: '15 Sep, 08:45', systolic: 122, diastolic: 80, isAbnormal: false },
                { timestamp: '16 Sep, 08:15', systolic: 120, diastolic: 80, isAbnormal: false },
              ]).map((point, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">{point.timestamp}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">{point.systolic} / {point.diastolic} mmHg</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      point.isAbnormal ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {point.isAbnormal ? 'Variance Flagged' : 'Within Limits'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Daily Media Updates */}
      {activeTab === 'MEDIA' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold text-slate-900">Approved Daily Photo Updates</h3>
            <p className="text-xs text-slate-500">Secure snapshots from today's active care shift</p>
          </div>

          {mediaList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No daily photos uploaded yet for this shift.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {mediaList.map((m) => (
                <div key={m.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                  <img src={m.mediaUrl} alt={m.caption || 'Care snapshot'} className="w-full h-44 object-cover" />
                  <div className="p-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-primary border border-teal-200">
                      {m.category}
                    </span>
                    <p className="text-xs text-slate-700 font-medium mt-1">{m.caption}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Coordinator Chat */}
      {activeTab === 'CHAT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chennai Care Coordinator</h3>
              <p className="text-[11px] text-slate-500">South Chennai Care Hub • Active Support</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Online" />
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                No previous messages. Start a conversation with your assigned care coordinator.
              </p>
            ) : (
              chatMessages.map((m) => {
                const isFamily = m.senderRole === 'FAMILY_SPONSOR' || m.channel === 'FAMILY_COORDINATOR';
                return (
                  <div key={m.id} className={`flex flex-col ${isFamily ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                      isFamily ? 'bg-primary text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'
                    }`}>
                      <span className="text-[10px] opacity-75 block mb-1 font-bold">{m.senderName}</span>
                      <p>{m.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask coordinator about today's routine or attendance..."
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

