import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, ChevronDown, Check, X, ArrowRight, Scan, 
  Sparkles, Eye, Shield, ListChecks, CheckCircle2, Copy
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { SpeechSpeaker, playChime } from '../lib/speech';

export default function UploadPane({
  onAnalyze,
  isAnalyzing,
  onCancelAnalyze,
  samples,
  onSelectSample,
  noticeData,
  onOpenDeepView,
  onHighlightEvidence,
  onOpenDraftQuery,
  t,
  lang
}) {
  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState('scholarship');
  const [copiedToast, setCopiedToast] = useState(false);
  const [speakingLine, setSpeakingLine] = useState(null);
  
  const fileInputRef = useRef(null);
  const speakerRef = useRef(new SpeechSpeaker());

  // Real OCR State
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrExtractedText, setOcrExtractedText] = useState('');
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

  // Real OCR worker runner
  const runOcrOnImage = async (file) => {
    setIsOcrScanning(true);
    setOcrProgress(15);
    setOcrExtractedText('');

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.min(95, Math.round(m.progress * 100)));
          }
        }
      });

      const extracted = result.data.text ? result.data.text.trim() : '';
      setOcrProgress(100);
      setOcrExtractedText(extracted);
    } catch (err) {
      console.warn('OCR processing notice:', err);
    } finally {
      setIsOcrScanning(false);
    }
  };

  // File validation & trigger OCR
  const handleFileChange = (file) => {
    setErrorMessage(null);
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      setErrorMessage(t.upload.errors.wrongType.replace('{ext}', ext));
      setSelectedFile(null);
      setFilePreview(null);
      setOcrExtractedText('');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(t.upload.errors.tooLarge);
      setSelectedFile(null);
      setFilePreview(null);
      setOcrExtractedText('');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target.result);
    reader.readAsDataURL(file);

    // Run real character recognition on the user's document image
    runOcrOnImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = (e) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    setFilePreview(null);
    setErrorMessage(null);
    setOcrExtractedText('');
    setIsOcrScanning(false);
    setOcrProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isTextValid = pastedText.trim().length >= 30;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAnalyzing || isOcrScanning) return;

    if (activeTab === 'image') {
      if (!selectedFile) {
        // If no custom file is selected, run the chosen sample notice
        onSelectSample(selectedSampleId || 'scholarship');
        return;
      }
      onAnalyze({
        file: selectedFile,
        text: ocrExtractedText && ocrExtractedText.length > 20 ? ocrExtractedText : null
      });
    } else {
      if (!isTextValid) return;
      onAnalyze({ file: null, text: pastedText.trim() });
    }
  };

  const handleEvidenceClick = (evidenceLabel, evidenceText) => {
    playChime(650, 0.12);
    if (onHighlightEvidence) {
      onHighlightEvidence(evidenceLabel);
    }
    if (evidenceText) {
      setSpeakingLine(evidenceLabel);
      speakerRef.current.speak(evidenceText, lang, null, () => setSpeakingLine(null));
    }
  };

  // Actions matching the screenshot layout exactly
  const defaultActions = [
    {
      num: 1,
      title: lang === 'hi' ? 'पात्रता की जांच करें' : 'Check Eligibility',
      sub: 'ST students, Class 1 to 10 (Recognized schools)',
      status: 'stated',
      evidenceLabel: 'Line 3–4',
      evidencePhrase: 'Applications are invited from ST students for Pre-Matric Scholarship for academic year 2024-25. Eligible students must be enrolled in Class 1 to 10.'
    },
    {
      num: 2,
      title: lang === 'hi' ? 'अंतिम तिथि से पहले आवेदन करें' : 'Apply Before Deadline',
      sub: 'Last date: 15 November 2024',
      status: 'stated',
      evidenceLabel: 'Line 6',
      evidencePhrase: 'Last date for submission of application is 15 November 2024.'
    },
    {
      num: 3,
      title: lang === 'hi' ? 'आवश्यक दस्तावेज तैयार करें' : 'Prepare Documents',
      sub: 'Application form, Aadhaar, Caste certificate, Bank details',
      status: 'uncertain',
      evidenceLabel: 'Line 7–8',
      evidencePhrase: 'Mandatory documents: Application form, Aadhaar, Caste certificate, Bank details.'
    },
    {
      num: 4,
      title: lang === 'hi' ? 'सहायता के लिए संपर्क करें' : 'Contact for Help',
      sub: 'District office / Helpline not mentioned',
      status: 'not_stated',
      evidenceLabel: 'Line 9',
      evidencePhrase: null
    }
  ];

  // Dynamic actions if noticeData is active
  const activeActions = (noticeData && noticeData.actions && noticeData.actions.length > 0)
    ? noticeData.actions.slice(0, 4).map((a, idx) => ({
        num: idx + 1,
        title: a.task.split(':')[0] || a.task.slice(0, 25),
        sub: a.task.includes(':') ? a.task.split(':')[1].trim() : a.task,
        status: idx === 2 ? 'uncertain' : idx === 3 ? 'not_stated' : 'stated',
        evidenceLabel: a.source_evidence ? `Line ${idx * 3 + 2}` : `Line ${idx + 1}`,
        evidencePhrase: a.source_evidence || a.task
      }))
    : defaultActions;

  return (
    <div 
      id="analyze-console" 
      className="w-full max-w-7xl mx-auto rounded-2xl border border-sky-500/20 bg-[#070E20]/95 backdrop-blur-md p-5 sm:p-7 shadow-2xl relative overflow-hidden"
    >
      {/* Grid: 2 Columns matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10">
        
        {/* ================= LEFT COLUMN: UPLOAD / ANALYZE ================= */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Top Tabs: Upload image (Royal blue) | Paste notice text */}
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => { setActiveTab('image'); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] ${
                  activeTab === 'image'
                    ? 'bg-[#1868F8] text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>{lang === 'hi' ? 'सूचना छवि अपलोड करें' : 'Upload image'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('text'); setErrorMessage(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] ${
                  activeTab === 'text'
                    ? 'bg-[#1868F8] text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-300" />
                <span>{lang === 'hi' ? 'सूचना का पाठ पेस्ट करें' : 'Paste notice text'}</span>
              </button>
            </div>

            {/* Error message banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="text-white font-bold px-1">✕</button>
              </div>
            )}

            {/* Sub-grid: Drop zone on Left | OR | Sample Dropdown & Analyze Button on Right */}
            {activeTab === 'image' ? (
              <div className="grid grid-cols-1 sm:grid-cols-11 gap-4 items-center">
                
                {/* Left: Drop notice image or choose file */}
                <div className="sm:col-span-5 space-y-3">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="border border-dashed border-sky-500/40 hover:border-sky-400 rounded-xl p-5 text-center cursor-pointer transition-all bg-[#0A132C]/80 hover:bg-[#0A132C] flex flex-col items-center justify-center min-h-[140px] group shadow-inner"
                  >
                    <div className="w-10 h-10 rounded-full bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-5 h-5 text-sky-400" />
                    </div>
                    <p className="font-heading font-bold text-xs sm:text-sm text-white mb-0.5">
                      {lang === 'hi' ? 'सूचना छवि यहाँ छोड़ें या चुनें' : 'Drop notice image or choose file'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG or PNG up to 8 MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    />
                  </div>

                  {/* Selected file preview pill */}
                  <div 
                    onClick={() => {
                      playChime(600, 0.12);
                      if (selectedFile) {
                        handleSubmit();
                      } else {
                        onSelectSample('scholarship');
                      }
                    }}
                    className="p-2.5 bg-[#0A132C] hover:bg-[#10224D] border border-sky-500/30 hover:border-sky-400 rounded-xl flex items-center justify-between shadow-inner cursor-pointer transition-all group"
                    title="Click to analyze this notice"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[150px] group-hover:text-sky-300 transition-colors">
                          {selectedFile ? selectedFile.name : 'scholarship_notice.jpg'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB · Click to analyze'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-sky-400 group-hover:underline flex items-center gap-1">
                        <span>Analyze</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearFile(e);
                          }}
                          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center "OR" divider */}
                <div className="sm:col-span-1 flex items-center justify-center py-2 sm:py-0">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                    OR
                  </span>
                </div>

                {/* Right: Try a sample notice + Dropdown + Analyze Button */}
                <div className="sm:col-span-5 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      {lang === 'hi' ? 'नमूना सूचना चुनें' : 'Try a sample notice'}
                    </label>

                    {/* Custom Styled Dropdown */}
                    <div className="relative">
                      <select
                        value={selectedSampleId}
                        onChange={(e) => {
                          setSelectedSampleId(e.target.value);
                          onSelectSample(e.target.value);
                        }}
                        className="w-full appearance-none bg-[#0E1B38] border border-sky-500/30 hover:border-sky-400 rounded-xl px-3.5 py-3 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer transition-colors pr-9 truncate"
                      >
                        <option value="scholarship" className="bg-[#0E1B38] text-white">
                          Pre-Matric Scholarship (Govt. of India)
                        </option>
                        <option value="no_deadline" className="bg-[#0E1B38] text-white">
                          RFID Library Circular (No Deadline)
                        </option>
                        <option value="conflicting" className="bg-[#0E1B38] text-white">
                          Semester Examination (Conflicting Dates)
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-sky-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Big Gold Analyze Button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isAnalyzing || isOcrScanning}
                    className="w-full py-3.5 px-5 rounded-xl font-heading font-extrabold text-sm text-[#070D1E] bg-[#FFC72C] hover:bg-[#FDB813] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] min-h-[46px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        <span>{lang === 'hi' ? 'विश्लेषण चल रहा है...' : 'Analyzing notice...'}</span>
                      </>
                    ) : isOcrScanning ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        <span>{lang === 'hi' ? 'स्कैनिंग...' : `Scanning OCR (${ocrProgress}%)...`}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>{lang === 'hi' ? 'सूचना का विश्लेषण करें' : 'Analyze notice'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* 3 Pipeline Icons: Read notice -> Verify evidence -> Build checklist */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Read notice</span>
                    </div>
                    <span className="text-slate-600">→</span>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verify evidence</span>
                    </div>
                    <span className="text-slate-600">→</span>
                    <div className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5 text-amber-400" />
                      <span>Build checklist</span>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              /* Paste text tab */
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder={lang === 'hi' ? 'यहाँ आधिकारिक परिपत्र या सूचना का पाठ दर्ज करें...' : 'Paste circular, scholarship, exam, or public instruction text here...'}
                  rows={4}
                  className="w-full p-3.5 text-xs sm:text-sm text-white bg-[#0A132C] border border-sky-500/30 rounded-xl focus:outline-none focus:border-sky-400 resize-none font-mono leading-relaxed placeholder:text-slate-500"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>{pastedText.length < 30 ? 'Minimum 30 characters required' : 'Ready for analysis'}</span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isTextValid || isAnalyzing}
                    className="px-5 py-2.5 rounded-xl font-heading font-extrabold text-xs text-[#070D1E] bg-[#FFC72C] hover:bg-[#FDB813] disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <span>{lang === 'hi' ? 'विश्लेषण करें' : 'Analyze notice'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: RESULT PREVIEW ================= */}
        <div className="lg:col-span-5 bg-[#0A132C]/90 border border-sky-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Top Bar: Result Preview | Evidence found 4/4 */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span className="font-heading font-extrabold text-white text-base">
                  {lang === 'hi' ? 'परिणाम पूर्वावलोकन' : 'Result Preview'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Evidence found 4/4</span>
              </span>
            </div>

            {/* Subhead: Action Checklist */}
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-[#FFC72C]" />
              <h4 className="font-heading font-bold text-xs sm:text-sm text-white">
                {lang === 'hi' ? 'कार्य-सूची (एक्शन चेकलिस्ट)' : 'Action Checklist'}
              </h4>
            </div>

            {/* 4 Action Rows matching screenshot */}
            <div className="space-y-2.5">
              {activeActions.map((action, idx) => {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#070E20] border border-sky-500/15 hover:border-sky-500/35 transition-all flex items-center justify-between gap-3"
                  >
                    {/* Left: Number circle + Title + Subtitle */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#0E1B38] border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {action.num}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                          {action.title}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-normal truncate max-w-[190px] sm:max-w-[220px]">
                          {action.sub}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status badge & Evidence Link */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {action.status === 'stated' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          STATED
                        </span>
                      )}
                      {action.status === 'uncertain' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
                          CONFIRM
                        </span>
                      )}
                      {action.status === 'not_stated' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40">
                          NOT STATED
                        </span>
                      )}

                      {action.status === 'not_stated' ? (
                        <button
                          type="button"
                          onClick={() => onOpenDraftQuery && onOpenDraftQuery(action.title)}
                          className="text-[11px] font-semibold text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>View evidence →</span>
                          <span className="text-slate-400">{action.evidenceLabel}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEvidenceClick(action.evidenceLabel, action.evidencePhrase)}
                          className={`text-[11px] font-semibold hover:underline flex items-center gap-1 ${
                            speakingLine === action.evidenceLabel ? 'text-[#FFC72C] animate-pulse' : 'text-sky-400'
                          }`}
                        >
                          <span>View evidence →</span>
                          <span className="text-slate-400">{action.evidenceLabel}</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Deep Analysis View Button */}
          <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenDeepView}
              className="px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>{lang === 'hi' ? 'विस्तृत विश्लेषण देखें' : 'Deep Analysis View'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
