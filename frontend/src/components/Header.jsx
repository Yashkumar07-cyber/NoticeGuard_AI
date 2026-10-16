import React, { useState } from 'react';
import { Sparkles, Globe, ChevronDown, RefreshCw, Shield, HelpCircle, Check } from 'lucide-react';

export default function Header({
  lang,
  onToggleLang,
  isMockMode,
  hasActiveNotice,
  onNewNotice,
  t
}) {
  const [activeTab, setActiveTab] = useState('product');
  const [infoModal, setInfoModal] = useState(null);

  return (
    <>
      <header className="w-full bg-[#060B18]/90 border-b border-sky-500/15 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          {/* Left: Brand Logo & Intelligence Badge */}
          <div className="flex items-center gap-3">
            <button 
              onClick={hasActiveNotice ? onNewNotice : undefined}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              aria-label="NoticeGuard AI Home"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F1E3D] text-[#FFC72C] flex items-center justify-center font-heading font-black text-base shadow-md border border-[#FFC72C]/60">
                NG
              </div>
              <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                NoticeGuard AI
              </span>
            </button>

            {/* Pill Badge matching reference design */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0D1B3A] text-[#FFC72C] border border-[#FFC72C]/40 shadow-xs">
              <Check className="w-3.5 h-3.5 text-[#FFC72C] stroke-[3]" />
              <span>Evidence-backed notice intelligence</span>
            </div>
          </div>

          {/* Center Navigation Links matching reference design */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <button
              onClick={() => setActiveTab('product')}
              className={`py-1 transition-colors relative ${activeTab === 'product' ? 'text-white font-bold' : 'hover:text-white'}`}
            >
              Product
              {activeTab === 'product' && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-0.5 bg-[#FFC72C] rounded-full shadow-[0_0_8px_#FFC72C]"></span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('howItWorks');
                setInfoModal('howItWorks');
              }}
              className={`py-1 transition-colors relative ${activeTab === 'howItWorks' ? 'text-white' : 'hover:text-white'}`}
            >
              How it works
            </button>

            <button
              onClick={() => {
                setActiveTab('trustSafety');
                setInfoModal('trustSafety');
              }}
              className={`py-1 transition-colors relative ${activeTab === 'trustSafety' ? 'text-white' : 'hover:text-white'}`}
            >
              Trust & Safety
            </button>
          </nav>

          {/* Right Controls: Language Selector & New Notice */}
          <div className="flex items-center gap-3">
            {hasActiveNotice && (
              <button
                onClick={onNewNotice}
                className="h-9 px-3.5 rounded-full text-xs font-bold text-white bg-[#0E1B38] hover:bg-[#15274E] border border-sky-500/30 transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.results.nav.newNotice}</span>
              </button>
            )}

            {/* Language Switcher matching reference pill */}
            <button
              onClick={onToggleLang}
              className="h-10 px-4 rounded-full text-xs sm:text-sm font-semibold bg-[#0E1B38] border border-sky-500/35 hover:border-sky-500/60 text-white flex items-center gap-2 transition-all min-h-[44px] shadow-sm"
              aria-label={`Switch to ${lang === 'en' ? 'Hindi' : 'English'}`}
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

        </div>
      </header>

      {/* Interactive Info Modal for "How it works" or "Trust & Safety" */}
      {infoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0E1B38] border border-sky-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-white animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                {infoModal === 'howItWorks' ? (
                  <>
                    <HelpCircle className="w-5 h-5 text-[#FFC72C]" />
                    <span>How NoticeGuard AI Works</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span>Trust & Safety Protocol</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {infoModal === 'howItWorks' ? (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>1. <strong className="text-white">Upload or Paste:</strong> Drag any notice image (JPG, PNG) or paste text.</p>
                <p>2. <strong className="text-white">Live OCR & Evidence Mapping:</strong> Real-time text extraction scans character by character.</p>
                <p>3. <strong className="text-white">Strict Verification:</strong> Only facts explicitly stated in the circular appear. Missing items show "Not stated in this notice".</p>
                <p>4. <strong className="text-white">Action Checklist:</strong> Converts confusing rules into ticks, reminders, WhatsApp sharing, and .ics calendar exports.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                <p>• <strong className="text-white">Zero Disk Storage:</strong> Your notice lives strictly in browser and memory during the active session. Nothing is ever saved to disk.</p>
                <p>• <strong className="text-white">No Hallucinations:</strong> Missing details are never guessed or filled from outside training data.</p>
                <p>• <strong className="text-white">Multilingual Grounding:</strong> Numbers, dates, fees, and institution names remain strictly identical across Hindi and English translations.</p>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 rounded-full bg-[#FFC72C] text-[#070D1E] font-bold text-xs hover:bg-[#FDB813] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
