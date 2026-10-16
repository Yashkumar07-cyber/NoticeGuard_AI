import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero3D from './components/Hero3D';
import UploadPane from './components/UploadPane';
import ResultsView from './components/ResultsView';
import DraftMessageModal from './components/DraftMessageModal';

import enTranslations from './i18n/en.json';
import hiTranslations from './i18n/hi.json';
import { fetchHealth, fetchSamples, fetchSampleDetails, analyzeNotice, translateNotice } from './lib/api';
import { playChime } from './lib/speech';
import { AlertCircle, RefreshCw, ArrowRight, Play, Sparkles, Shield, Globe, Lock, UploadCloud, LayoutGrid } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('en'); // 'en' | 'hi'
  const [isMockMode, setIsMockMode] = useState(true);
  const [samples, setSamples] = useState([]);
  
  // View mode: 'overview' (Hero + 2-Column Console) | 'deep' (Full 2-pane interactive ResultsView)
  const [viewMode, setViewMode] = useState('overview');

  // Active Notice State
  const [noticeData, setNoticeData] = useState(null);
  const [rawNoticeText, setRawNoticeText] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);

  // Active highlighted line on the 3D sheet
  const [activeHighlightedLine, setActiveHighlightedLine] = useState(null);

  // Draft query modal state
  const [draftQueryTask, setDraftQueryTask] = useState(null);

  // Analysis Loading State & Abort Controller
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const abortControllerRef = useRef(null);

  // Translation cache for quick toggling
  const translationCacheRef = useRef({});

  // Confirm dialog for clearing session
  const [showConfirmNewNotice, setShowConfirmNewNotice] = useState(false);

  const t = lang === 'hi' ? hiTranslations : enTranslations;

  // On mount: fetch health check and sample notices list
  useEffect(() => {
    async function init() {
      const health = await fetchHealth();
      setIsMockMode(health.mock_mode);

      const sampleList = await fetchSamples();
      if (sampleList && sampleList.length > 0) {
        setSamples(sampleList);
      } else {
        setSamples([
          { id: 'scholarship', title: 'Pre-Matric Scholarship (Govt. of India)', description: 'Tribal Affairs Pre-Matric Scholarship with strict deadline.' },
          { id: 'no_deadline', title: 'Library RFID Circular', description: 'Library circular with missing deadline.' },
          { id: 'conflicting', title: 'Semester Examination', description: 'Exam registration with two conflicting closing dates.' },
        ]);
      }
    }
    init();
  }, []);

  // Check if checklist has unsaved ticked items
  const hasUnsavedTicks = noticeData?.actions?.some(a => a.done);

  // Language Toggle Handler: calls translate API or uses cached translation
  const handleToggleLang = async () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    playChime(500, 0.1);

    if (noticeData) {
      const cacheKey = `${nextLang}_${noticeData.purpose?.value?.slice(0, 20)}`;
      if (translationCacheRef.current[cacheKey]) {
        setNoticeData(translationCacheRef.current[cacheKey]);
        return;
      }

      try {
        const translated = await translateNotice(noticeData, nextLang);
        translationCacheRef.current[cacheKey] = translated;
        setNoticeData(translated);
      } catch (err) {
        console.warn('Translation failed, switching chrome only:', err);
      }
    }
  };

  // Sample Notice Selected
  const handleSelectSample = async (sampleId) => {
    setAnalysisError(null);
    setIsAnalyzing(true);
    setLoadingStep(1);
    playChime(600, 0.12);

    try {
      const sample = await fetchSampleDetails(sampleId);
      setTimeout(() => setLoadingStep(2), 250);
      setTimeout(() => setLoadingStep(3), 500);
      setTimeout(() => {
        setNoticeData(sample.analysis);
        setRawNoticeText(sample.raw_notice_text);
        setUploadedImagePreview(null);
        setIsAnalyzing(false);
        setLoadingStep(0);
      }, 750);
    } catch (err) {
      console.error('Error loading sample:', err);
      setAnalysisError(t.upload.errors.modelFailure);
      setIsAnalyzing(false);
      setLoadingStep(0);
    }
  };

  // Analyze Handler
  const handleAnalyze = async ({ file, text }) => {
    setAnalysisError(null);
    setIsAnalyzing(true);
    setLoadingStep(1);
    playChime(550, 0.15);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setUploadedImagePreview(null);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Incremental skeleton progression
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, 4));
    }, 300);

    try {
      const result = await analyzeNotice({
        file,
        text,
        signal: controller.signal
      });
      clearInterval(stepInterval);
      setNoticeData(result);
      setRawNoticeText(result.raw_notice_text || text || '');
      setIsAnalyzing(false);
      setLoadingStep(0);
      playChime(880, 0.2);
    } catch (err) {
      clearInterval(stepInterval);
      if (err.name === 'AbortError') {
        setIsAnalyzing(false);
        setLoadingStep(0);
        return;
      }

      console.error('Analyze error:', err);
      if (!navigator.onLine) {
        setAnalysisError(t.upload.errors.network);
      } else if (err.message && (err.message.includes('sharper') || err.message?.includes('unreadable'))) {
        setAnalysisError(t.upload.errors.unreadable);
      } else if (err.message && err.message.includes('Only JPG')) {
        setAnalysisError(err.message);
      } else {
        setAnalysisError(t.upload.errors.modelFailure);
      }
      setIsAnalyzing(false);
      setLoadingStep(0);
    }
  };

  const handleCancelAnalyze = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setLoadingStep(0);
  };

  // New Notice Trigger
  const handleNewNoticeClick = () => {
    if (hasUnsavedTicks) {
      setShowConfirmNewNotice(true);
    } else {
      resetSession();
    }
  };

  const resetSession = () => {
    setNoticeData(null);
    setRawNoticeText('');
    setUploadedImagePreview(null);
    setAnalysisError(null);
    setShowConfirmNewNotice(false);
    setViewMode('overview');
    translationCacheRef.current = {};
    playChime(400, 0.15);
  };

  const scrollToConsole = () => {
    playChime(600, 0.1);
    const el = document.getElementById('analyze-console');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060B18] text-white selection:bg-[#FFC72C] selection:text-black font-body">
      
      {/* Top Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        isMockMode={isMockMode}
        hasActiveNotice={Boolean(noticeData)}
        onNewNotice={handleNewNoticeClick}
        t={t}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        
        {viewMode === 'overview' ? (
          /* ================= OVERVIEW SCREEN: HERO + 2-COLUMN CONSOLE ================= */
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
            
            {/* Analysis Error Notification if any */}
            {analysisError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-start justify-between gap-3 text-xs sm:text-sm text-rose-200 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300">Notice Error: </span>
                    <span>{analysisError}</span>
                  </div>
                </div>
                <button
                  onClick={() => setAnalysisError(null)}
                  className="text-xs font-bold text-rose-300 underline min-h-[44px] px-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Skeleton Rows while analyzing */}
            {isAnalyzing && (
              <div className="mb-8 p-6 bg-[#0E1B38] rounded-2xl border border-sky-500/30 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#FFC72C] border-t-transparent rounded-full animate-spin"></span>
                    <span className="font-heading font-bold text-sm text-white">
                      {lang === 'hi' ? 'सूचना का विश्लेषण किया जा रहा है...' : 'Reading notice evidence...'}
                    </span>
                  </div>
                  <button
                    onClick={handleCancelAnalyze}
                    className="text-xs font-bold text-rose-400 underline hover:text-rose-300"
                  >
                    {t.upload.cancelBtn}
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className={`p-3 rounded-lg border transition-all ${loadingStep >= 1 ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#070D1E] border-white/10 animate-pulse'}`}>
                    <div className="h-4 bg-white/20 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-3/4"></div>
                  </div>
                  <div className={`p-3 rounded-lg border transition-all ${loadingStep >= 2 ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#070D1E] border-white/10 animate-pulse'}`}>
                    <div className="h-4 bg-white/20 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  </div>
                  <div className={`p-3 rounded-lg border transition-all ${loadingStep >= 3 ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-[#070D1E] border-white/10 animate-pulse'}`}>
                    <div className="h-4 bg-white/20 rounded w-2/5 mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Hero Section matching reference screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mb-10">
              
              {/* Left Column: Eyebrow + Headline + Subhead + CTA buttons + 3 circular badges */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Eyebrow badge matching screenshot */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#101C38] text-[#FFC72C] border border-[#FFC72C]/40 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>FROM NOTICE TO NEXT STEP</span>
                </div>

                <div>
                  <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.08]">
                    <span className="text-white block">Every notice.</span>
                    <span className="bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#FFC72C] bg-clip-text text-transparent block">
                      Clear next steps.
                    </span>
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
                    {lang === 'hi'
                      ? 'कठिन छात्रवृत्ति, कॉलेज और सार्वजनिक सेवा सूचनाओं को स्पष्ट, साक्ष्य-आधारित कार्य-सूचियों में बदलें — स्रोत लिंक के साथ, अंग्रेजी और हिन्दी में।'
                      : 'Turn confusing scholarship, college and public-service notices into clear, evidence-backed action checklists — with source links, in English and हिन्दी.'}
                  </p>
                </div>

                {/* CTA Buttons Row matching screenshot */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={scrollToConsole}
                    className="px-6 py-3.5 rounded-full bg-[#FFC72C] hover:bg-[#FDB813] text-[#070D1E] font-heading font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-lg shadow-amber-500/25 active:scale-95 transition-all min-h-[48px]"
                  >
                    <UploadCloud className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>{lang === 'hi' ? 'सूचना का विश्लेषण करें' : 'Analyze a notice'}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => handleSelectSample('scholarship')}
                    className="px-6 py-3.5 rounded-full bg-[#0E1B38] hover:bg-[#15274E] text-white border border-sky-500/40 hover:border-sky-400 font-semibold text-sm sm:text-base flex items-center gap-2.5 transition-all min-h-[48px] shadow-sm"
                  >
                    <Play className="w-4 h-4 text-sky-400 fill-sky-400/40" />
                    <span>{lang === 'hi' ? 'लाइव डेमो देखें' : 'Explore live demo'}</span>
                  </button>
                </div>

                {/* 3 Circular Feature Badges in a Row matching screenshot */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                    <div className="w-8 h-8 rounded-full bg-[#0E1B38] border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span>Evidence-linked answers</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                    <div className="w-8 h-8 rounded-full bg-[#0E1B38] border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span>English + हिन्दी</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                    <div className="w-8 h-8 rounded-full bg-[#0E1B38] border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span>Nothing saved by default</span>
                  </div>
                </div>

              </div>

              {/* Right Column: 3D Holographic Notice Scanner Board */}
              <div className="lg:col-span-7 flex justify-center w-full overflow-visible">
                <Hero3D
                  activeHighlightedLine={activeHighlightedLine}
                  onSelectFeature={(featureId) => {
                    if (featureId === 'deadline') {
                      handleSelectSample('scholarship');
                    } else if (featureId === 'contact') {
                      handleSelectSample('no_deadline');
                    } else {
                      handleSelectSample('conflicting');
                    }
                  }}
                  t={t}
                  lang={lang}
                />
              </div>

            </div>

            {/* Bottom 2-Column Interactive Console */}
            <UploadPane
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              onCancelAnalyze={handleCancelAnalyze}
              samples={samples}
              onSelectSample={handleSelectSample}
              noticeData={noticeData}
              onOpenDeepView={() => setViewMode('deep')}
              onHighlightEvidence={(label) => {
                setActiveHighlightedLine(label);
                setTimeout(() => setActiveHighlightedLine(null), 3500);
              }}
              onOpenDraftQuery={(task) => setDraftQueryTask(task)}
              t={t}
              lang={lang}
            />

          </div>
        ) : (
          /* ================= DEEP RESULTS SCREEN ================= */
          <ResultsView
            noticeData={noticeData}
            rawNoticeText={rawNoticeText}
            uploadedImagePreview={uploadedImagePreview}
            onUpdateNoticeData={(updated) => setNoticeData(updated)}
            onBackToOverview={() => setViewMode('overview')}
            lang={lang}
            t={t}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 border-t border-sky-500/15 text-center text-xs text-slate-400 bg-[#060B18]">
        <p>
          NoticeGuard AI • Evidence-grounded plain-language checklists • MIT License
        </p>
      </footer>

      {/* Draft Message Modal */}
      {draftQueryTask && (
        <DraftMessageModal
          isOpen={Boolean(draftQueryTask)}
          onClose={() => setDraftQueryTask(null)}
          fieldName={draftQueryTask}
          contactValue={noticeData?.contact?.value || ''}
          noticeTitle={noticeData?.purpose?.value || 'Official Circular'}
          lang={lang}
          t={t}
        />
      )}

      {/* Confirm New Notice Modal */}
      {showConfirmNewNotice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0E1B38] rounded-xl border border-sky-500/30 shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95">
            <h3 className="font-heading font-bold text-base text-white mb-2">
              {t.results.nav.newNotice}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
              {t.results.nav.confirmNewNotice}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowConfirmNewNotice(false)}
                className="px-4 py-2 rounded-full border border-sky-500/30 text-xs font-bold text-white hover:bg-white/10 transition-colors min-h-[44px]"
              >
                {t.results.actions.cancel}
              </button>
              <button
                onClick={resetSession}
                className="px-4 py-2 rounded-full bg-[#FFC72C] text-black text-xs font-bold hover:bg-[#FDB813] transition-colors min-h-[44px]"
              >
                {lang === 'hi' ? 'हाँ, नया नोटिस शुरू करें' : 'Yes, start new notice'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
