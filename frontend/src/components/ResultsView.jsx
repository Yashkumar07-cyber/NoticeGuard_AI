import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, HelpCircle, AlertTriangle, Eye, Edit3, Check, X,
  Copy, Share2, Calendar, Volume2, Pause, Square, Sparkles, MessageCircle, FileText,
  ChevronRight, ArrowRight, Shield, ListChecks
} from 'lucide-react';
import { generateAndDownloadIcs } from '../lib/ics';
import { SpeechSpeaker, playChime } from '../lib/speech';
import DraftMessageModal from './DraftMessageModal';
import GuidedModeModal from './GuidedModeModal';
import AskPanel from './AskPanel';

export default function ResultsView({
  noticeData,
  rawNoticeText,
  uploadedImagePreview,
  onUpdateNoticeData,
  onBackToOverview,
  lang,
  t
}) {
  // Mobile Tab State: 'notice' | 'details' | 'checklist' | 'ask'
  const [mobileTab, setMobileTab] = useState('details');

  // Evidence highlighting
  const [activeHighlightEvidence, setActiveHighlightEvidence] = useState(null);
  const [activeHighlightRegion, setActiveHighlightRegion] = useState(null);

  // Modals & Tools
  const [draftModalData, setDraftModalData] = useState(null);
  const [guidedModalOpen, setGuidedModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Inline editing state: { fieldKey: string, docIndex?: number, value: string }
  const [editingField, setEditingField] = useState(null);

  // User confirmations log: list of { field: string, value: string, timestamp: string }
  const [confirmationsLog, setConfirmationsLog] = useState([]);

  // Read Aloud State
  const [readingStatus, setReadingStatus] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const speakerRef = useRef(new SpeechSpeaker());
  const highlightTimeoutRef = useRef(null);
  const noticeScrollRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (speakerRef.current) speakerRef.current.stop();
    };
  }, []);

  const showToast = (msg) => {
    playChime(750, 0.1);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. "See in notice": Scrolls and zooms left pane, applies #FFD93D highlight for 3s
  const handleSeeInNotice = (evidence, region) => {
    if (!evidence && !region) return;
    playChime(600, 0.1);
    setActiveHighlightEvidence(evidence);
    setActiveHighlightRegion(region);

    if (noticeScrollRef.current) {
      noticeScrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setActiveHighlightEvidence(null);
      setActiveHighlightRegion(null);
    }, 3500);
  };

  // 2. "Confirm (uncertain field)"
  const handleConfirmField = (fieldKey, currentValue) => {
    playChime(700, 0.12);
    const updated = { ...noticeData };
    if (fieldKey === 'deadline') {
      updated.deadline = {
        ...updated.deadline,
        status: 'stated',
        confirmed_by_user: true
      };
    } else if (fieldKey === 'purpose') {
      updated.purpose = { ...updated.purpose, status: 'stated', confirmed_by_user: true };
    } else if (fieldKey === 'eligibility') {
      updated.eligibility = { ...updated.eligibility, status: 'stated', confirmed_by_user: true };
    } else if (fieldKey === 'contact') {
      updated.contact = { ...updated.contact, status: 'stated', confirmed_by_user: true };
    } else if (fieldKey === 'fee') {
      updated.fee = { ...updated.fee, status: 'stated', confirmed_by_user: true };
    }

    updated.uncertainties = (updated.uncertainties || []).filter(u => !u.toLowerCase().includes(fieldKey));

    setConfirmationsLog(prev => [
      ...prev,
      {
        field: t.results.fields[fieldKey] || fieldKey,
        value: currentValue || 'Confirmed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    onUpdateNoticeData(updated);
    showToast(lang === 'hi' ? 'विवरण की पुष्टि कर दी गई' : 'Field confirmed by you');
  };

  // 3. "Use this one (conflicting)"
  const handleUseOption = (fieldKey, chosenSnippet, chosenValue) => {
    playChime(700, 0.12);
    const updated = { ...noticeData };
    if (fieldKey === 'deadline') {
      updated.deadline = {
        ...updated.deadline,
        value: chosenValue,
        status: 'stated',
        confirmed_by_user: true,
        chosen_option: chosenValue,
        evidence: chosenSnippet
      };
    }

    updated.conflicts = (updated.conflicts || []).filter(c => c.field !== fieldKey);

    setConfirmationsLog(prev => [
      ...prev,
      {
        field: `${t.results.fields[fieldKey] || fieldKey} (${chosenValue})`,
        value: chosenSnippet,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    onUpdateNoticeData(updated);
    showToast(lang === 'hi' ? 'चयनित विकल्प सहेजा गया' : 'Selected date confirmed');
  };

  // 4. "Edit value"
  const handleSaveEdit = () => {
    if (!editingField) return;
    playChime(700, 0.12);
    const { fieldKey, docIndex, value } = editingField;
    const updated = { ...noticeData };

    if (docIndex !== undefined) {
      if (updated.required_documents && updated.required_documents[docIndex]) {
        updated.required_documents[docIndex] = {
          ...updated.required_documents[docIndex],
          value: value.trim(),
          edited_by_user: true
        };
      }
    } else if (fieldKey && updated[fieldKey]) {
      updated[fieldKey] = {
        ...updated[fieldKey],
        value: value.trim(),
        edited_by_user: true
      };
    }

    setConfirmationsLog(prev => [
      ...prev,
      {
        field: docIndex !== undefined ? `Document #${docIndex + 1}` : (t.results.fields[fieldKey] || fieldKey),
        value: `Edited to: ${value.trim()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    onUpdateNoticeData(updated);
    setEditingField(null);
    showToast(lang === 'hi' ? 'संशोधित मान सहेजा गया' : 'Value saved (marked edited by you)');
  };

  // 5. Checklist Toggle
  const handleToggleChecklist = (stepNum) => {
    playChime(650, 0.1);
    const updated = { ...noticeData };
    if (updated.actions) {
      updated.actions = updated.actions.map(action => {
        if (action.step === stepNum) {
          return { ...action, done: !action.done };
        }
        return action;
      });
      onUpdateNoticeData(updated);
    }
  };

  // 6. Copy Checklist
  const handleCopyChecklist = () => {
    const isHindi = lang === 'hi';
    const lines = [
      isHindi ? 'कार्य-सूची (NoticeGuard AI):' : 'Action Checklist (NoticeGuard AI):',
      ...(noticeData.actions || []).map(a => `[${a.done ? 'X' : ' '}] Step ${a.step}: ${a.task}`)
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast(t.results.actions.copiedToast);
  };

  // 7. Share on WhatsApp
  const handleShareWhatsApp = () => {
    playChime(600, 0.1);
    const isHindi = lang === 'hi';
    const text = [
      `*${noticeData.purpose?.value || (isHindi ? 'सूचना चेकलिस्ट' : 'Notice Checklist')}*`,
      noticeData.deadline?.value ? `*${isHindi ? 'अंतिम तिथि' : 'Deadline'}:* ${noticeData.deadline.value}` : null,
      '',
      `*${isHindi ? 'कार्य-सूची' : 'Action Checklist'}:*`,
      ...(noticeData.actions || []).map(a => `${a.done ? '✓' : '•'} ${a.task}`),
      '',
      '_Verified by NoticeGuard AI_'
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // 8. Download .ics Calendar
  const handleDownloadIcs = () => {
    playChime(800, 0.15);
    try {
      const summary = noticeData.purpose?.value || 'Notice Deadline';
      const description = `Deadline for ${noticeData.purpose?.value || 'Notice'}.\nVerified by NoticeGuard AI.`;
      generateAndDownloadIcs(noticeData.deadline?.value, summary, description);
      showToast(lang === 'hi' ? '.ics कैलेंडर डाउनलोड हुआ' : '.ics calendar file downloaded');
    } catch (e) {
      console.error(e);
      showToast(lang === 'hi' ? 'कैलेंडर फाइल बनाने में समस्या' : 'Failed to generate calendar file');
    }
  };

  const isIcsEnabled = noticeData.deadline?.status === 'stated' || noticeData.deadline?.confirmed_by_user;

  // 9. Read Aloud
  const handleReadAloud = () => {
    if (readingStatus === 'playing') {
      speakerRef.current.pause();
      setReadingStatus('paused');
      return;
    }

    if (readingStatus === 'paused') {
      speakerRef.current.resume();
      setReadingStatus('playing');
      return;
    }

    const isHindi = lang === 'hi';
    const sentences = [
      noticeData.summary,
      isHindi ? 'मुख्य विवरण:' : 'Key details:',
      noticeData.deadline?.value
        ? (isHindi ? `अंतिम तिथि है ${noticeData.deadline.value}।` : `Deadline is ${noticeData.deadline.value}.`)
        : (isHindi ? 'अंतिम तिथि का उल्लेख नहीं है।' : 'Deadline is not stated in notice.'),
      isHindi ? 'कार्य-सूची:' : 'Checklist:',
      ...(noticeData.actions || []).map(a => `${isHindi ? 'चरण' : 'Step'} ${a.step}: ${a.task.replace(/[*_#]/g, '')}`)
    ].filter(Boolean);

    const fullText = sentences.join(' ');
    setReadingStatus('playing');

    speakerRef.current.speak(
      fullText,
      lang,
      null,
      () => setReadingStatus('idle'),
      () => setReadingStatus('idle')
    );
  };

  const handleStopReading = () => {
    speakerRef.current.stop();
    setReadingStatus('idle');
  };

  const hasUncertainties = (noticeData.uncertainties && noticeData.uncertainties.length > 0) ||
    noticeData.deadline?.status === 'uncertain' ||
    noticeData.deadline?.status === 'conflicting' ||
    noticeData.purpose?.status === 'uncertain' ||
    noticeData.eligibility?.status === 'uncertain' ||
    noticeData.fee?.status === 'uncertain' ||
    noticeData.contact?.status === 'uncertain';

  // Status Badge Helper
  const renderStatusBadge = (field) => {
    if (!field) return null;
    if (field.confirmed_by_user) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>{t.results.states.confirmed_by_you}</span>
        </span>
      );
    }
    if (field.edited_by_user) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-[#FFC72C] border border-[#FFC72C]/50">
          <Edit3 className="w-3 h-3 text-[#FFC72C]" />
          <span>{t.results.states.edited_by_you}</span>
        </span>
      );
    }

    switch (field.status) {
      case 'stated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t.results.states.stated}</span>
          </span>
        );
      case 'uncertain':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <AlertCircle className="w-3 h-3" />
            <span>{t.results.states.uncertain}</span>
          </span>
        );
      case 'conflicting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50">
            <AlertTriangle className="w-3 h-3" />
            <span>{t.results.states.conflicting}</span>
          </span>
        );
      case 'not_stated':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40">
            <HelpCircle className="w-3 h-3" />
            <span>{t.results.states.not_stated}</span>
          </span>
        );
    }
  };

  // Field Row Helper
  const renderFieldRow = (fieldKey, label, field) => {
    if (!field) return null;
    const isEditing = editingField && editingField.fieldKey === fieldKey;

    return (
      <div 
        key={fieldKey}
        className="p-4 rounded-xl bg-[#0B152B]/95 border border-sky-500/20 hover:border-sky-500/40 transition-all flex flex-col gap-2 relative shadow-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading font-bold text-xs sm:text-sm text-sky-400 tracking-wider uppercase">
            {label}
          </span>
          {renderStatusBadge(field)}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              className="flex-1 p-2 text-xs sm:text-sm border border-sky-500/40 rounded-lg font-semibold text-white bg-[#070E20] focus:outline-none focus:border-sky-400"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="px-3.5 py-1.5 rounded-lg bg-[#FFC72C] text-black text-xs font-bold hover:bg-[#FDB813] transition-colors min-h-[36px]"
            >
              {t.results.actions.save}
            </button>
            <button
              onClick={() => setEditingField(null)}
              className="px-3.5 py-1.5 rounded-lg border border-white/20 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors min-h-[36px]"
            >
              {t.results.actions.cancel}
            </button>
          </div>
        ) : (
          <div className="mt-0.5">
            <p className={`text-xs sm:text-sm font-bold leading-snug ${field.value ? 'text-white' : 'text-slate-400 italic'}`}>
              {field.value || t.results.states.not_stated}
            </p>
            {field.evidence && (
              <p className="mt-1.5 text-[11px] text-slate-400 italic border-l-2 border-[#FFC72C] pl-2.5">
                "{field.evidence}"
              </p>
            )}
          </div>
        )}

        {/* Conflicting Options Selection */}
        {field.status === 'conflicting' && field.options && field.options.length > 0 && (
          <div className="mt-2 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40">
            <p className="text-[11px] font-bold text-amber-300 mb-2">
              {lang === 'hi' ? 'दो विरोधाभासी विकल्प मिले। कृपया सही विकल्प चुनें:' : 'Conflicting values detected. Choose the applicable one:'}
            </p>
            <div className="space-y-2">
              {field.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#070E20] border border-amber-500/30 text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-white block truncate">{opt.value}</span>
                    <span className="text-[10px] text-slate-400 italic truncate block">"{opt.snippet}" ({opt.region})</span>
                  </div>
                  <button
                    onClick={() => handleUseOption(fieldKey, opt.snippet, opt.value)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFC72C] text-black hover:bg-[#FDB813] transition-colors"
                  >
                    {t.results.actions.useThis}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons for this row */}
        <div className="mt-1 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {field.evidence && (
              <button
                type="button"
                onClick={() => handleSeeInNotice(field.evidence, field.region)}
                className="text-[11px] font-bold text-sky-400 hover:underline flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.results.actions.seeInNotice}</span>
              </button>
            )}

            {field.status === 'not_stated' && (
              <button
                type="button"
                onClick={() => setDraftModalData({ fieldKey, fieldName: label, contact: noticeData.contact?.value })}
                className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{t.results.actions.draftMessage}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {field.status === 'uncertain' && !field.confirmed_by_user && (
              <button
                type="button"
                onClick={() => handleConfirmField(fieldKey, field.value)}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-[#FFC72C] text-black hover:bg-[#FDB813] transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.results.actions.confirm}</span>
              </button>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={() => setEditingField({ fieldKey, value: field.value || '' })}
                className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{t.results.actions.edit}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    );
  };

  // Notice Sheet Viewer
  const renderNoticeViewer = () => {
    return (
      <div 
        ref={noticeScrollRef}
        className="w-full bg-[#FFFFFF] rounded-2xl border-2 border-white/70 shadow-2xl p-5 sm:p-6 relative overflow-hidden text-ink font-body"
      >
        <div className="absolute top-1/2 left-0 right-0 h-px fold-line pointer-events-none opacity-40"></div>

        {/* Header */}
        <div className="border-b border-ink/15 pb-3 mb-4 text-center">
          <p className="text-[10px] font-mono tracking-wider font-bold text-ink/70 uppercase">
            SOURCE DOCUMENT EVIDENCE
          </p>
          <h2 className="font-heading font-extrabold text-sm sm:text-base text-ink mt-0.5">
            {noticeData.purpose?.value || 'Official Circular Text'}
          </h2>
        </div>

        {/* Uploaded Image view if provided */}
        {uploadedImagePreview && (
          <div className="mb-4 rounded-xl border border-ink/20 overflow-hidden bg-slate-900">
            <img 
              src={uploadedImagePreview} 
              alt="Uploaded source notice" 
              className="w-full h-auto object-contain max-h-[300px]"
            />
          </div>
        )}

        {/* Notice text with live highlight */}
        <div className="space-y-3 font-mono text-xs sm:text-[13px] leading-relaxed text-ink/90 whitespace-pre-line select-text">
          {rawNoticeText ? (
            rawNoticeText.split('\n').map((line, lIdx) => {
              const matchesEvidence = activeHighlightEvidence && 
                line.toLowerCase().includes(activeHighlightEvidence.toLowerCase().slice(0, 25));

              return (
                <div 
                  key={lIdx}
                  className={`transition-colors duration-300 p-1 rounded ${
                    matchesEvidence ? 'bg-highlighter text-ink font-bold shadow-md ring-2 ring-highlighter' : ''
                  }`}
                >
                  {line}
                </div>
              );
            })
          ) : (
            <p className="italic text-ink-muted">
              {lang === 'hi' ? 'मूल टेक्स्ट उपलब्ध नहीं है।' : 'Original notice text not available.'}
            </p>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-3 border-t border-ink/10 flex justify-between items-center text-[10px] font-mono text-ink-muted">
          <span>{lang === 'hi' ? 'साक्ष्य जांच प्रणाली' : 'NoticeGuard AI Verification'}</span>
          <span className="font-bold text-emerald-700">100% EVIDENCE GROUNDED</span>
        </div>
      </div>
    );
  };

  const doneActions = (noticeData.actions || []).filter(a => a.done).length;
  const totalActions = (noticeData.actions || []).length || 1;
  const progressPercent = Math.round((doneActions / totalActions) * 100);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-white font-body">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full bg-[#0E1B38] text-white font-bold text-xs shadow-2xl border border-sky-500/40 flex items-center gap-2.5 animate-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#FFC72C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top back navigation bar */}
      {onBackToOverview && (
        <div className="mb-6 flex items-center justify-between pb-3.5 border-b border-white/10">
          <button
            onClick={onBackToOverview}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0E1B38] hover:bg-[#15274E] text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-400 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>← Back to Holographic Board</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs sm:text-sm font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">
              {noticeData.purpose?.value || 'Detailed Notice Intelligence'}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Desktop Two Panes */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT PANE: STICKY NOTICE SHEET ================= */}
        <div className="md:col-span-5 md:sticky md:top-24 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t.results.nav.viewNotice}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {lang === 'hi' ? 'सत्यापित साक्ष्य' : 'Verified Evidence'}
            </span>
          </div>

          <div className="bg-[#0A132C]/95 rounded-2xl border border-sky-500/25 p-3 sm:p-4 shadow-2xl">
            {renderNoticeViewer()}
          </div>
        </div>

        {/* ================= RIGHT PANE: ANALYSIS, CHECKLIST, DETAILS, ASK ================= */}
        <div className="md:col-span-7 space-y-6">
          
          {/* 1. Summary Card & Read Aloud Controls */}
          <div className="bg-[#0A132C]/95 rounded-2xl border border-sky-500/25 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                <span>{t.results.summaryTitle}</span>
              </h2>

              {/* Action Buttons: Read aloud, WhatsApp, ICS */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReadAloud}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    readingStatus === 'playing'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-sm'
                      : 'bg-[#0E1B38] text-white border border-sky-500/35 hover:border-sky-400'
                  }`}
                  title="Read summary and checklist aloud"
                >
                  {readingStatus === 'playing' ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{readingStatus === 'playing' ? t.results.actions.pause : t.results.actions.readAloud}</span>
                </button>

                {readingStatus !== 'idle' && (
                  <button
                    onClick={handleStopReading}
                    className="h-9 px-3 rounded-full text-xs font-bold bg-[#0E1B38] text-rose-400 border border-rose-500/30 hover:border-rose-400"
                    title="Stop reading"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={handleShareWhatsApp}
                  className="h-9 px-3.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-md"
                  title="Share summary on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={handleDownloadIcs}
                  disabled={!isIcsEnabled}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isIcsEnabled
                      ? 'bg-[#FFC72C] hover:bg-[#FDB813] text-black shadow-md'
                      : 'bg-[#0E1B38] text-slate-500 border border-white/10 opacity-50 cursor-not-allowed'
                  }`}
                  title={isIcsEnabled ? 'Download .ics calendar reminder' : 'Requires confirmed deadline'}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>.ics</span>
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-body">
              {noticeData.summary}
            </p>
          </div>

          {/* 2. Needs Attention Strip (if any) */}
          {hasUncertainties && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/70 border border-amber-500/50 shadow-xl space-y-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-amber-300">
                    {t.results.attentionTitle}
                  </h3>
                  <p className="text-xs text-amber-200/90 leading-normal">
                    {t.results.attentionSub}
                  </p>
                  
                  <ul className="mt-2 space-y-1 text-xs text-amber-100 font-medium list-disc list-inside">
                    {noticeData.conflicts && noticeData.conflicts.length > 0 && (
                      <li>
                        {lang === 'hi' ? 'अंतिम तिथि में विरोधाभास है (नीचे तालिका में विकल्प चुनें)' : 'Conflict found in deadline dates (choose option in Key Details)'}
                      </li>
                    )}
                    {(noticeData.uncertainties || []).map((unc, uIdx) => (
                      <li key={uIdx}>{unc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 3. Confirmations List */}
          {confirmationsLog.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs shadow-md">
              <div className="flex items-center gap-2 mb-2 font-bold text-emerald-400 font-heading">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.results.confirmationsTitle}</span>
              </div>
              <div className="space-y-1.5">
                {confirmationsLog.map((log, lIdx) => (
                  <div key={lIdx} className="flex justify-between items-center text-slate-200 py-0.5 border-b border-emerald-500/20 last:border-0">
                    <span className="font-semibold">{log.field}: <span className="font-normal text-slate-300">{log.value}</span></span>
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Action Checklist Panel */}
          <div className="bg-[#0A132C]/95 rounded-2xl border border-sky-500/25 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="font-heading font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-[#FFC72C]" />
                  <span>{t.results.checklistTitle}</span>
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {t.results.progress.replace('{done}', doneActions).replace('{total}', totalActions)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyChecklist}
                  className="h-9 px-3.5 rounded-full text-xs font-bold bg-[#0E1B38] hover:bg-[#15274E] text-slate-300 border border-white/15 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                <button
                  onClick={() => setGuidedModalOpen(true)}
                  className="h-9 px-4 rounded-full text-xs font-bold bg-[#0E1B38] hover:bg-[#15274E] text-purple-300 border border-purple-500/40 flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>{t.results.actions.guideMe}</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#070E20] overflow-hidden border border-white/10">
              <div 
                className="h-full bg-[#FFC72C] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {(noticeData.actions || []).map((action) => (
                <div 
                  key={action.step}
                  className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    action.done
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-90'
                      : 'bg-[#0B152B] border-sky-500/20 hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(action.step)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        action.done
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'border-slate-500 hover:border-sky-400 bg-transparent'
                      }`}
                      aria-label={`Toggle step ${action.step}`}
                    >
                      {action.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <p className={`text-xs sm:text-sm font-semibold leading-snug ${action.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {action.task}
                      </p>
                    </div>
                  </div>

                  {action.source_evidence && (
                    <button
                      type="button"
                      onClick={() => handleSeeInNotice(action.source_evidence)}
                      className="text-[11px] font-semibold text-sky-400 hover:underline shrink-0 flex items-center gap-1"
                    >
                      <span>Evidence</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Key Details Section */}
          <div className="space-y-3">
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-white tracking-wide uppercase px-1">
              {t.results.keyDetailsTitle}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {renderFieldRow('purpose', t.results.fields.purpose, noticeData.purpose)}
              {renderFieldRow('deadline', t.results.fields.deadline, noticeData.deadline)}
              {renderFieldRow('eligibility', t.results.fields.eligibility, noticeData.eligibility)}
              {renderFieldRow('fee', t.results.fields.fee, noticeData.fee)}
              {renderFieldRow('contact', t.results.fields.contact, noticeData.contact)}

              {/* Documents List */}
              {noticeData.required_documents && noticeData.required_documents.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0B152B]/95 border border-sky-500/20 hover:border-sky-500/40 transition-all flex flex-col gap-2 shadow-md">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="font-heading font-bold text-xs sm:text-sm text-sky-400 tracking-wider uppercase">
                      {t.results.fields.required_documents}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {noticeData.required_documents.length} REQUIRED
                    </span>
                  </div>

                  <div className="space-y-2 mt-1">
                    {noticeData.required_documents.map((doc, dIdx) => (
                      <div key={dIdx} className="p-3 rounded-lg bg-[#070E20] border border-sky-500/15 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-white">
                            {doc.value}
                          </p>
                          {doc.evidence && (
                            <p className="text-[10px] text-slate-400 italic">
                              "{doc.evidence}"
                            </p>
                          )}
                        </div>
                        {doc.evidence && (
                          <button
                            type="button"
                            onClick={() => handleSeeInNotice(doc.evidence)}
                            className="text-[11px] font-semibold text-sky-400 hover:underline shrink-0"
                          >
                            See in notice
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. Ask Panel */}
          <AskPanel noticeData={noticeData} lang={lang} t={t} />

        </div>

      </div>

      {/* Guided Mode Modal */}
      {guidedModalOpen && (
        <GuidedModeModal
          isOpen={guidedModalOpen}
          onClose={() => setGuidedModalOpen(false)}
          actions={noticeData.actions || []}
          onToggleAction={handleToggleChecklist}
          lang={lang}
          t={t}
        />
      )}

      {/* Draft Message Modal */}
      {draftModalData && (
        <DraftMessageModal
          isOpen={Boolean(draftModalData)}
          onClose={() => setDraftModalData(null)}
          fieldName={draftModalData.fieldName}
          contactValue={draftModalData.contact}
          noticeTitle={noticeData.purpose?.value}
          lang={lang}
          t={t}
        />
      )}

    </div>
  );
}
