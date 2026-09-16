import React, { useState } from 'react';
import type { CareAssignment } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  MessageSquareHeart, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Heart
} from 'lucide-react';

interface FeedbackModalProps {
  assignment: CareAssignment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FEEDBACK_TAGS = [
  'Punctuality',
  'Care Quality',
  'Communication',
  'Professionalism',
  'Hygiene & Safety',
  'Reliability',
  'Patience & Empathy',
  'Dietary Adherence'
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [caregiverRating, setCaregiverRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Care Quality', 'Punctuality']);
  const [comment, setComment] = useState('');
  const [seniorFeedback, setSeniorFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.submitFeedback({
        assignmentId: assignment.id,
        caregiverRating,
        serviceRating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
        seniorFeedback: seniorFeedback.trim() || undefined
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition"
          >
            <Star className={`w-6 h-6 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
        <span className="ml-2 text-xs font-bold text-slate-700">{value} of 5 Stars</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Care Quality & Feedback</h2>
              <p className="text-xs text-slate-500">
                Attendant: <strong className="text-slate-700">{assignment.caregiver?.fullName || 'Assigned Caregiver'}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Thank You for Your Feedback!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your feedback ensures the highest standard of elder care in Chennai. Our supervisory team continually reviews attendant metrics.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Ratings row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Caregiver Rating
                </label>
                {renderStarSelector(caregiverRating, setCaregiverRating)}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  CareConnect Service Rating
                </label>
                {renderStarSelector(serviceRating, setServiceRating)}
              </div>
            </div>

            {/* QA Alert Notice */}
            {(caregiverRating <= 2 || serviceRating <= 2) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Automatic Supervisory Review:</strong> Ratings of 2 stars or below automatically open an escalated issue in the Chennai Operations QA queue for proactive manager intervention.
                </p>
              </div>
            )}

            {/* Tag Selection Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Highlights & Key Observations
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Family Comments */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Family Comments & Suggestions (Optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Share any specific moments of care, punctuality notes, or areas of improvement..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none transition"
              />
            </div>

            {/* Senior's Direct Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Elder's Direct Remarks (What did mother/father say?)</span>
              </label>
              <input
                type="text"
                value={seniorFeedback}
                onChange={e => setSeniorFeedback(e.target.value)}
                placeholder='e.g. "She is very gentle and speaks softly."'
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none transition"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[48px] px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-900 hover:bg-teal-800 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Feedback</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

