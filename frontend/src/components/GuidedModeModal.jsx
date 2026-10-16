import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, Mic, ArrowRight, RotateCcw, CheckCircle2, Check } from 'lucide-react';
import { SpeechSpeaker, SpeechListener, isSpeechRecognitionSupported } from '../lib/speech';

export default function GuidedModeModal({
  isOpen,
  onClose,
  actions,
  onToggleAction,
  lang,
  t
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [heardCommand, setHeardCommand] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakerRef = useRef(new SpeechSpeaker());
  const listenerRef = useRef(null);

  const totalSteps = actions ? actions.length : 0;
  const currentAction = actions && actions[currentStepIndex];

  // Initialize SpeechListener
  useEffect(() => {
    if (!isOpen) {
      if (speakerRef.current) speakerRef.current.stop();
      if (listenerRef.current) listenerRef.current.stop();
      return;
    }

    if (isSpeechRecognitionSupported()) {
      listenerRef.current = new SpeechListener({
        lang: lang === 'hi' ? 'hi-IN' : 'en-IN',
        continuous: true,
        onResult: ({ final, interim }) => {
          const phrase = (final || interim).toLowerCase();
          setHeardCommand(phrase);

          if (phrase.includes('next') || phrase.includes('अगला') || phrase.includes('आगे')) {
            handleNext();
          } else if (phrase.includes('repeat') || phrase.includes('दोहराओ') || phrase.includes('फिर से')) {
            handleRepeat();
          } else if (phrase.includes('done') || phrase.includes('हो गया') || phrase.includes('पूर्ण') || phrase.includes('कंप्लीट')) {
            handleDone();
          }
        },
        onError: () => setIsListening(false),
        onEnd: () => setIsListening(false)
      });
      listenerRef.current.start();
      setIsListening(true);
    }

    // Read initial step
    readCurrentStep();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (speakerRef.current) speakerRef.current.stop();
      if (listenerRef.current) listenerRef.current.stop();
    };
  }, [isOpen, currentStepIndex]);

  const readCurrentStep = () => {
    if (!currentAction) return;
    const stepAnnouncement = lang === 'hi'
      ? `चरण ${currentStepIndex + 1}। ${currentAction.task}`
      : `Step ${currentStepIndex + 1}. ${currentAction.task}`;
    
    setIsSpeaking(true);
    speakerRef.current.speak(stepAnnouncement, lang, null, () => setIsSpeaking(false), () => setIsSpeaking(false));
  };

  const handleNext = () => {
    setHeardCommand('');
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleRepeat = () => {
    setHeardCommand('');
    readCurrentStep();
  };

  const handleDone = () => {
    setHeardCommand('');
    if (currentAction && !currentAction.done) {
      onToggleAction(currentAction.step);
    }
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  if (!isOpen || !currentAction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-modal-title"
    >
      <div className="bg-white rounded-panel border border-ink/20 shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-verified animate-ping"></span>
            <h3 id="guided-modal-title" className="font-heading font-bold text-base sm:text-lg text-ink">
              {t.guided.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-paper transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close guided mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            {t.guided.stepOf.replace('{current}', currentStepIndex + 1).replace('{total}', totalSteps)}
          </span>
          <div className="flex items-center gap-1">
            {actions.map((act, i) => (
              <span
                key={act.step}
                className={`w-6 h-1.5 rounded-full transition-colors ${
                  i === currentStepIndex
                    ? 'bg-ink'
                    : act.done
                    ? 'bg-verified'
                    : 'bg-ink/15'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Step Card */}
        <div className="mt-4 p-5 rounded-panel bg-paper border border-ink/15 relative">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
              currentAction.done ? 'bg-verified text-white border-verified' : 'bg-white text-ink border-ink/30'
            }`}>
              {currentAction.done ? <Check className="w-4 h-4" /> : currentAction.step}
            </div>
            <div>
              <p className="font-body text-sm sm:text-base font-semibold text-ink leading-relaxed">
                {currentAction.task}
              </p>
              {currentAction.source_evidence && (
                <p className="mt-2 text-xs text-ink-muted italic border-l-2 border-highlighter pl-2">
                  "{currentAction.source_evidence}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Voice Feedback Strip */}
        <div className="mt-4 p-2.5 rounded-panel bg-white border border-ink/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isListening ? 'text-confirm animate-pulse' : 'text-ink-muted'}`} />
            <span className="text-ink-muted">
              {heardCommand ? `Heard: "${heardCommand}"` : t.guided.sayHint}
            </span>
          </div>
          {isSpeaking && (
            <span className="flex items-center gap-1 text-ink font-semibold">
              <Volume2 className="w-3.5 h-3.5 text-verified animate-bounce" />
              Speaking
            </span>
          )}
        </div>

        {/* Interactive Action Buttons */}
        <div className="mt-5 pt-3 border-t border-ink/10 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={handleRepeat}
            className="h-10 px-3.5 rounded-full text-xs font-bold text-ink bg-white border border-ink/20 hover:border-ink/50 flex items-center gap-1.5 transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.guided.repeat}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDone}
              className={`h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[44px] ${
                currentAction.done
                  ? 'bg-verified-bg text-verified border border-verified'
                  : 'bg-verified text-white hover:bg-verified/90'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.guided.done}</span>
            </button>

            {currentStepIndex < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className="h-10 px-4 rounded-full text-xs font-bold bg-ink text-white hover:bg-ink-muted flex items-center gap-1.5 transition-colors min-h-[44px]"
              >
                <span>{t.guided.next}</span>
                <ArrowRight className="w-3.5 h-3.5 text-highlighter" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-full text-xs font-bold bg-ink text-white hover:bg-ink-muted transition-colors min-h-[44px]"
              >
                <span>{t.guided.exit}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
