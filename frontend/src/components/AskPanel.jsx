import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, MessageCircle, AlertCircle, Check, Play } from 'lucide-react';
import { SpeechListener, SpeechSpeaker, isSpeechRecognitionSupported, playChime } from '../lib/speech';
import { askQuestion } from '../lib/api';

export default function AskPanel({
  noticeData,
  lang,
  t
}) {
  const [question, setQuestion] = useState('');
  const [listenLang, setListenLang] = useState(lang === 'hi' ? 'hi-IN' : 'en-IN');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [speakAnswers, setSpeakAnswers] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState([]);
  const [micStatusMessage, setMicStatusMessage] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const listenerRef = useRef(null);
  const speakerRef = useRef(new SpeechSpeaker());
  const autoSendTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
    setListenLang(lang === 'hi' ? 'hi-IN' : 'en-IN');
  }, [lang]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (listenerRef.current) listenerRef.current.stop();
      if (speakerRef.current) speakerRef.current.stop();
    };
  }, []);

  const handleToggleListenLang = () => {
    playChime(700, 0.1);
    const next = listenLang === 'hi-IN' ? 'en-IN' : 'hi-IN';
    setListenLang(next);
    if (listenerRef.current) {
      listenerRef.current.setLang(next === 'hi-IN' ? 'hi' : 'en');
    }
    setMicStatusMessage(next === 'hi-IN' ? 'हिन्दी में सुनना चालू है' : 'Listening in English');
    setTimeout(() => setMicStatusMessage(null), 2500);
  };

  const handleToggleListening = () => {
    if (isListening) {
      if (listenerRef.current) listenerRef.current.stop();
      setIsListening(false);
      setMicStatusMessage(null);
      return;
    }

    if (!speechSupported) {
      setMicStatusMessage(lang === 'hi' ? 'ब्राउज़र में वॉइस सपोर्ट नहीं है। कृपया टाइप करें।' : 'Voice input not supported in this browser. Please type.');
      return;
    }

    playChime(800, 0.12);
    setSpeakAnswers(true);
    setInterimText('');
    setMicStatusMessage(listenLang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now');

    listenerRef.current = new SpeechListener({
      lang: listenLang,
      continuous: false,
      onResult: ({ final, interim, isFinal }) => {
        if (isFinal && final) {
          setQuestion(final);
          setInterimText('');
          setIsListening(false);
          setMicStatusMessage(listenLang === 'hi-IN' ? `सुना: "${final}"` : `Heard: "${final}"`);
          autoSendTimerRef.current = setTimeout(() => {
            handleSubmitQuestion(final);
            setMicStatusMessage(null);
          }, 1000);
        } else {
          setInterimText(interim);
        }
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        if (err === 'not-allowed') {
          setMicStatusMessage(lang === 'hi' ? 'माइक्रोफ़ोन की अनुमति दें (URL बार में चेक करें)।' : 'Microphone permission blocked. Please allow mic in browser.');
        } else if (err === 'no-speech') {
          setMicStatusMessage(lang === 'hi' ? 'आवाज़ नहीं सुनाई दी। कृपया दोबारा बोलें।' : 'No speech detected. Please speak into mic.');
        } else {
          setMicStatusMessage(lang === 'hi' ? 'आवाज़ पहचान में समस्या आई।' : 'Voice recognition error.');
        }
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    const started = listenerRef.current.start();
    if (started) {
      setIsListening(true);
    } else {
      setMicStatusMessage(lang === 'hi' ? 'माइक्रोफ़ोन शुरू नहीं हो सका।' : 'Could not start microphone.');
    }
  };

  const handleSubmitQuestion = async (qText) => {
    const textToSend = (qText || question).trim();
    if (!textToSend || isAsking) return;

    playChime(600, 0.1);
    setIsAsking(true);
    setQuestion('');
    setInterimText('');

    try {
      const res = await askQuestion(noticeData, textToSend, lang);
      
      const newEntry = {
        question: textToSend,
        answer: res.answer,
        evidence: res.evidence,
        answerable: res.answerable,
        timestamp: new Date()
      };

      setHistory((prev) => [newEntry, ...prev]);

      if (speakAnswers) {
        const hasHindiChars = /[\u0900-\u097F]/.test(textToSend) || listenLang === 'hi-IN';
        const targetLang = hasHindiChars ? 'hi' : 'en';

        speakerRef.current.speak(res.answer, targetLang);
      }
    } catch (err) {
      console.error('Ask error:', err);
      setHistory((prev) => [
        {
          question: textToSend,
          answer: lang === 'hi' ? 'उत्तर प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।' : 'Failed to get answer. Please try again.',
          answerable: false,
          evidence: null,
          timestamp: new Date()
        },
        ...prev
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleChipClick = (chipText) => {
    setQuestion(chipText);
    handleSubmitQuestion(chipText);
  };

  const handleSpeakAnswer = (answerText, idx) => {
    setSpeakingIndex(idx);
    speakerRef.current.speak(answerText, lang, null, () => setSpeakingIndex(null));
  };

  const sampleChips = lang === 'hi' 
    ? ['क्या एसटी छात्र पात्र हैं?', 'आवेदन की अंतिम तिथि क्या है?', 'कौन से दस्तावेज चाहिए?', 'क्या कोई शुल्क है?']
    : ['Who is eligible?', 'What is the deadline?', 'What documents are required?', 'Is there any application fee?'];

  return (
    <div className="bg-[#0A132C]/95 rounded-2xl border border-sky-500/25 shadow-2xl p-4 sm:p-6 flex flex-col text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0E1B38] border border-sky-500/40 flex items-center justify-center text-sky-400">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-white">
              {lang === 'hi' ? 'नोटिस से सीधे प्रश्न पूछें' : 'Ask AI about this notice'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {lang === 'hi' ? 'केवल सूचना में दिए गए तथ्यों पर आधारित उत्तर' : 'Evidence-grounded answers strictly from this notice'}
            </p>
          </div>
        </div>

        {/* Listen in & Speak answers switches */}
        <div className="flex items-center gap-2 text-xs">
          {/* Listen in language switch */}
          <button
            type="button"
            onClick={handleToggleListenLang}
            className="flex items-center gap-1.5 bg-[#0E1B38] hover:bg-[#15274E] px-3 py-1.5 rounded-full border border-sky-500/30 text-white font-semibold transition-colors"
          >
            <span className="text-[11px] text-slate-400">Listen in:</span>
            <span className="text-[11px] font-bold text-[#FFC72C]">
              {listenLang === 'hi-IN' ? 'हिन्दी' : 'English'}
            </span>
          </button>

          {/* Speak answers toggle */}
          <button
            type="button"
            onClick={() => {
              if (speakAnswers) speakerRef.current.stop();
              setSpeakAnswers(!speakAnswers);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${
              speakAnswers
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                : 'bg-[#0E1B38] text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Automatically speak AI answers aloud"
          >
            {speakAnswers ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{lang === 'hi' ? 'उत्तर बोलें' : 'Speak answers'}</span>
          </button>
        </div>
      </div>

      {/* Mic Status Banner */}
      {micStatusMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-sky-950/80 border border-sky-500/40 text-xs text-sky-200 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-[#FFC72C] animate-pulse shrink-0" />
            <span className="font-semibold">{micStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setMicStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {sampleChips.map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#0E1B38] hover:bg-[#15274E] border border-sky-500/25 hover:border-sky-400 text-slate-200 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-[#FFC72C] shrink-0" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Input Row */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuestion(); }} className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={interimText || question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setInterimText('');
            }}
            placeholder={
              isListening
                ? (listenLang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now')
                : (lang === 'hi' ? 'नोटिस के बारे में कोई भी प्रश्न पूछें...' : 'Ask any question about this notice...')
            }
            className={`w-full p-3.5 pr-10 text-xs sm:text-sm text-white bg-[#070E20] border rounded-xl focus:outline-none transition-all placeholder:text-slate-500 ${
              isListening
                ? 'border-[#FFC72C] ring-2 ring-[#FFC72C]/40 bg-[#0A1633]'
                : 'border-sky-500/30 focus:border-sky-400'
            }`}
          />
          {interimText && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FFC72C] animate-ping"></span>
          )}
        </div>

        {/* Mic Button with Pulsing Wave */}
        <button
          type="button"
          onClick={handleToggleListening}
          className={`p-3 rounded-xl border flex items-center justify-center transition-all shrink-0 min-h-[46px] min-w-[46px] ${
            isListening
              ? 'bg-[#FFC72C] text-black border-[#FFC72C] shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/30'
              : 'bg-[#0E1B38] border-sky-500/40 text-sky-400 hover:text-white hover:border-sky-400'
          }`}
          title={isListening ? 'Stop listening' : `Listen with mic (${listenLang})`}
        >
          {isListening ? <MicOff className="w-5 h-5 text-black" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!question.trim() && !interimText) || isAsking}
          className="p-3 rounded-xl bg-[#FFC72C] hover:bg-[#FDB813] text-[#070D1E] font-bold disabled:opacity-40 transition-all shrink-0 min-h-[46px] min-w-[46px] flex items-center justify-center shadow-lg shadow-amber-500/20"
        >
          {isAsking ? (
            <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Send className="w-5 h-5 stroke-[2.5]" />
          )}
        </button>
      </form>

      {/* Answer History */}
      {history.length > 0 && (
        <div className="mt-5 space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {history.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#070E20] border border-sky-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#FFC72C]">
                <span>Q: {item.question}</span>
                <span className="text-[10px] text-slate-500">
                  {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {item.answer}
              </div>

              {item.evidence && (
                <div className="text-[11px] text-slate-400 italic border-l-2 border-[#FFC72C] pl-2 mt-1">
                  "{item.evidence}"
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  item.answerable 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                }`}>
                  {item.answerable ? 'Evidence Found' : 'Not stated in notice'}
                </span>

                <button
                  type="button"
                  onClick={() => handleSpeakAnswer(item.answer, idx)}
                  className={`text-xs font-semibold hover:underline flex items-center gap-1 ${
                    speakingIndex === idx ? 'text-[#FFC72C] animate-pulse' : 'text-sky-400'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{speakingIndex === idx ? 'Speaking...' : 'Read aloud'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
