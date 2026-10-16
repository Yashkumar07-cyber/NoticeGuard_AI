import React, { useState, useRef } from 'react';
import { UserCheck, Calendar, FileText, PhoneCall, Clock } from 'lucide-react';

export default function Hero3D({ onSelectFeature, activeHighlightedLine, lang }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activeLayer, setActiveLayer] = useState(null);
  const containerRef = useRef(null);

  // Pointer parallax handler
  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;
    setTilt({
      x: -normY * 3.5,
      y: normX * 3.5
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
    setActiveLayer(null);
  };

  const baseRotX = 4 + tilt.x;
  const baseRotY = -4 + tilt.y;

  const currentActive = activeHighlightedLine || activeLayer;

  return (
    <div 
      className="relative w-full max-w-[860px] h-[350px] xs:h-[390px] sm:h-[460px] lg:h-[520px] flex items-center justify-center select-none overflow-visible py-1 sm:py-2"
      role="region" 
      aria-label="3D Holographic Notice Intelligence Board"
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Responsive Scaling Wrapper: Dynamically scales down to fit 360px-414px phones without overflow */}
      <div className="w-full flex items-center justify-center transform scale-[0.44] xs:scale-[0.52] sm:scale-[0.78] md:scale-[0.88] lg:scale-100 origin-center transition-transform duration-300">
        
        {/* 3D Scene Wrapper */}
        <div 
          className="scene-3d-wrapper relative flex items-center justify-center gap-4 sm:gap-6"
          style={{
            transform: `perspective(1400px) rotateX(${baseRotX}deg) rotateY(${baseRotY}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        >
          
          {/* ================= 1. HOLOGRAPHIC ELECTRIC BLUE & PURPLE VIBRANT AURA ================= */}
          <div 
            className="absolute w-[440px] h-[520px] rounded-full bg-gradient-to-tr from-blue-600/30 via-cyan-400/25 to-purple-600/30 filter blur-[60px] pointer-events-none"
            style={{ transform: 'translateZ(-20px)' }}
          />

          {/* ================= 2. LEFT BRANCHING CARDS COLUMN ================= */}
          <div className="flex flex-col gap-5 w-[215px] shrink-0 z-30" style={{ transform: 'translateZ(25px)' }}>
            
            {/* Card 1: ELIGIBILITY */}
            <div 
              onClick={() => onSelectFeature && onSelectFeature('eligibility')}
              onMouseEnter={() => setActiveLayer('eligibility')}
              onMouseLeave={() => setActiveLayer(null)}
              className={`p-3.5 rounded-2xl bg-[#0B152B]/95 border transition-all cursor-pointer shadow-2xl ${
                currentActive === 'eligibility' || currentActive === 'Line 3–4' 
                  ? 'border-sky-400 ring-2 ring-sky-400/40 scale-105 shadow-[0_0_20px_rgba(56,189,248,0.3)]' 
                  : 'border-sky-500/35 hover:border-sky-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">ELIGIBILITY</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  STATED
                </span>
              </div>

              <p className="text-xs font-bold text-white leading-snug">
                ST students, Class 1 to 10 (Recognized schools)
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2.5">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Line 3–4 · 92% confidence</span>
              </div>
            </div>

            {/* Card 2: DEADLINE */}
            <div 
              onClick={() => onSelectFeature && onSelectFeature('deadline')}
              onMouseEnter={() => setActiveLayer('deadline')}
              onMouseLeave={() => setActiveLayer(null)}
              className={`p-3.5 rounded-2xl bg-[#0B152B]/95 border transition-all cursor-pointer shadow-2xl ${
                currentActive === 'deadline' || currentActive === 'Line 6' 
                  ? 'border-[#FFC72C] ring-2 ring-[#FFC72C]/40 scale-105 shadow-[0_0_20px_rgba(255,199,44,0.3)]' 
                  : 'border-[#FFC72C]/35 hover:border-[#FFC72C]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-[#FFC72C]">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#FFC72C] uppercase tracking-wider">DEADLINE</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  STATED
                </span>
              </div>

              <p className="text-xs font-bold text-white leading-snug">
                15 November 2024
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2.5">
                <Clock className="w-3 h-3 text-[#FFC72C]" />
                <span>Line 6 · 98% confidence</span>
              </div>
            </div>

          </div>

          {/* ================= 3. CENTER CLEAN OFFICIAL NOTICE SHEET ================= */}
          <div 
            className="relative w-[285px] sm:w-[305px] h-[445px] bg-[#FFFFFF] rounded-xl border-2 border-white/80 p-5 shadow-2xl text-ink font-body z-20 overflow-hidden shrink-0"
            style={{ 
              transform: 'translateZ(0px)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 35px rgba(0, 180, 255, 0.3)'
            }}
          >
            {/* Subtle fold line */}
            <div className="absolute top-1/2 left-0 right-0 h-px fold-line pointer-events-none opacity-40"></div>

            {/* Official Emblem & Header matching screenshot */}
            <div className="text-center pb-2 mb-2 border-b border-ink/10">
              <div className="w-6 h-6 mx-auto mb-1 flex items-center justify-center opacity-85">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-ink">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
                </svg>
              </div>
              <p className="text-[8.5px] font-mono tracking-wider font-bold text-ink/75 uppercase leading-tight">
                TRIBAL AFFAIRS DEPARTMENT<br />Government of India
              </p>
              <h4 className="font-heading font-extrabold text-[12.5px] text-ink mt-1">
                Pre-Matric Scholarship Scheme
              </h4>
              <div className="flex justify-between text-[8px] font-mono text-ink/60 mt-0.5 px-1">
                <span>Notice No. 12/2024-25</span>
                <span>Date: 10 Oct 2024</span>
              </div>
            </div>

            {/* Authentic Notice Body Text with Clear Highlighter Overlays */}
            <div className="space-y-2 text-[10.5px] leading-relaxed text-ink/85 font-mono">
              {/* Paragraph 1: Eligibility */}
              <p>
                Applications are invited from{' '}
                <span className={`px-1 py-0.5 rounded-2xs font-bold transition-all ${
                  currentActive === 'eligibility' || currentActive === 'Line 3–4' 
                    ? 'bg-highlighter text-ink ring-2 ring-highlighter shadow-sm' 
                    : 'bg-highlighter/80 text-ink'
                }`}>
                  ST students
                </span>{' '}
                for Pre-Matric Scholarship for academic year 2024-25. Eligible students must be enrolled in{' '}
                <span className={`px-1 py-0.5 rounded-2xs font-bold transition-all ${
                  currentActive === 'eligibility' || currentActive === 'Line 3–4' 
                    ? 'bg-highlighter text-ink ring-2 ring-highlighter shadow-sm' 
                    : 'bg-highlighter/80 text-ink'
                }`}>
                  Class 1 to 10
                </span>{' '}
                in recognized schools.
              </p>

              {/* Paragraph 2: Deadline */}
              <p>
                Last date for submission of application is{' '}
                <span className={`px-1 py-0.5 rounded-2xs font-bold transition-all ${
                  currentActive === 'deadline' || currentActive === 'Line 6' 
                    ? 'bg-highlighter text-ink ring-2 ring-highlighter shadow-sm' 
                    : 'bg-highlighter/80 text-ink'
                }`}>
                  15 November 2024
                </span>
                . Applications can be submitted online through the National Scholarship Portal (NSP).
              </p>

              {/* Paragraph 3: Documents hint */}
              <p className="text-ink/75">
                <span className={`px-1 py-0.5 rounded-2xs font-bold transition-all ${
                  currentActive === 'documents' || currentActive === 'Line 7–8' 
                    ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400' 
                    : ''
                }`}>
                  Mandatory documents:
                </span>{' '}
                Application form, Aadhaar, Caste certificate, Bank details.
              </p>

              {/* Paragraph 4: Contact / Helpline */}
              <p>
                For more details, visit{' '}
                <span className="text-sky-700 underline font-semibold">www.nsp.gov.in</span>{' '}
                or contact the{' '}
                <span className={`px-1 py-0.5 rounded-2xs font-bold transition-all ${
                  currentActive === 'contact' || currentActive === 'Line 9' 
                    ? 'bg-rose-200 text-rose-900 ring-2 ring-rose-400' 
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  concerned district office
                </span>
                .
              </p>
            </div>

            {/* Signature block */}
            <div className="absolute bottom-3 right-5 text-right font-serif text-[8.5px] text-ink/70">
              <span className="italic block font-serif">Authorized Signatory</span>
              <span className="text-[7.5px] font-mono text-ink/50 uppercase">Tribal Affairs Department</span>
            </div>

            {/* Continuous Glowing Laser Scanning Beam */}
            <div className="absolute left-0 right-0 pointer-events-none animate-scan-beam z-10" style={{ height: '35px' }}>
              <div className="w-full h-7 bg-gradient-to-t from-highlighter/35 to-transparent"></div>
              <div className="w-full h-[2px] bg-highlighter shadow-[0_0_12px_#FFD93D]"></div>
            </div>
          </div>

          {/* ================= 4. RIGHT BRANCHING CARDS COLUMN ================= */}
          <div className="flex flex-col gap-5 w-[215px] shrink-0 z-30" style={{ transform: 'translateZ(25px)' }}>
            
            {/* Card 3: DOCUMENTS */}
            <div 
              onClick={() => onSelectFeature && onSelectFeature('documents')}
              onMouseEnter={() => setActiveLayer('documents')}
              onMouseLeave={() => setActiveLayer(null)}
              className={`p-3.5 rounded-2xl bg-[#0B152B]/95 border transition-all cursor-pointer shadow-2xl ${
                currentActive === 'documents' || currentActive === 'Line 7–8' 
                  ? 'border-purple-400 ring-2 ring-purple-400/40 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                  : 'border-purple-500/35 hover:border-purple-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">DOCUMENTS</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/30">
                  CONFIRM
                </span>
              </div>

              <p className="text-xs font-bold text-white leading-snug">
                Application form, Aadhaar, Caste certificate, Bank details
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2.5">
                <Clock className="w-3 h-3 text-purple-400" />
                <span>Line 7–8 · 76% confidence</span>
              </div>
            </div>

            {/* Card 4: CONTACT */}
            <div 
              onClick={() => onSelectFeature && onSelectFeature('contact')}
              onMouseEnter={() => setActiveLayer('contact')}
              onMouseLeave={() => setActiveLayer(null)}
              className={`p-3.5 rounded-2xl bg-[#0B152B]/95 border transition-all cursor-pointer shadow-2xl ${
                currentActive === 'contact' || currentActive === 'Line 9' 
                  ? 'border-rose-400 ring-2 ring-rose-400/40 scale-105 shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
                  : 'border-rose-500/35 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">CONTACT</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/30">
                  NOT STATED
                </span>
              </div>

              <p className="text-xs font-bold text-white leading-snug">
                District office / Helpline not mentioned
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2.5">
                <Clock className="w-3 h-3 text-rose-400" />
                <span>Line 9 · 41% confidence</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
