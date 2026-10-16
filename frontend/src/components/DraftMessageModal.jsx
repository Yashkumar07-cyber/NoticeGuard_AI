import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Mail } from 'lucide-react';

export default function DraftMessageModal({
  isOpen,
  onClose,
  fieldName,
  contactValue,
  noticeTitle,
  lang,
  t
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const recipient = contactValue || t.draftDialog.notStatedRecipient;
  const isHindi = lang === 'hi';

  const messageText = isHindi
    ? `नमस्ते,\n\nमैं आधिकारिक सूचना "${noticeTitle || 'सूचना'}" के संदर्भ में संपर्क कर रहा हूँ।\nनोटिस में ${fieldName || 'अपेक्षित विवरण'} का स्पष्ट उल्लेख नहीं है। कृपया इस संबंध में सही विवरण या दिशा-निर्देश प्रदान करने की कृपा करें।\n\nधन्यवाद।`
    : `Respected Authority / Helpdesk,\n\nI am contacting you regarding the official notice "${noticeTitle || 'Official Circular'}".\nI noticed that the ${fieldName || 'required detail'} is not clearly stated in the circular. Could you please clarify this detail and provide the necessary instructions?\n\nThank you for your assistance.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanPhone = (recipient.match(/\d{10}/) || [])[0] || '';
  const waUrl = cleanPhone 
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const cleanEmail = (recipient.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || '';
  const mailtoUrl = cleanEmail
    ? `mailto:${cleanEmail}?subject=${encodeURIComponent(t.draftDialog.subject)}&body=${encodeURIComponent(messageText)}`
    : `mailto:?subject=${encodeURIComponent(t.draftDialog.subject)}&body=${encodeURIComponent(messageText)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
    >
      <div 
        className="bg-white rounded-panel border border-ink/20 shadow-xl max-w-lg w-full p-5 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ink/10">
          <h3 id="draft-modal-title" className="font-heading font-bold text-base sm:text-lg text-ink">
            {t.draftDialog.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-paper transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient info */}
        <div className="mt-4 p-2.5 rounded-panel bg-paper border border-ink/10 text-xs">
          <span className="font-semibold text-ink-muted mr-1.5">{t.draftDialog.recipient}</span>
          <span className="font-mono font-medium text-ink">{recipient}</span>
        </div>

        {/* Message body */}
        <div className="mt-3">
          <label className="text-xs font-semibold text-ink-muted block mb-1">
            {isHindi ? 'संदेश का प्रारूप:' : 'Ready-to-send draft message:'}
          </label>
          <textarea
            readOnly
            value={messageText}
            rows={6}
            className="w-full p-3 text-xs sm:text-sm font-body bg-paper/30 border border-ink/20 rounded-panel text-ink focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Actions: Copy, WhatsApp, Email */}
        <div className="mt-5 pt-3 border-t border-ink/10 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={handleCopy}
            className="h-10 px-4 rounded-full text-xs font-bold bg-ink text-white hover:bg-ink-muted transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-highlighter" />
                <span>{t.draftDialog.copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.draftDialog.copyMessage}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-3.5 rounded-full text-xs font-bold bg-verified text-white hover:bg-verified/90 transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t.draftDialog.sendWhatsApp}</span>
            </a>

            <a
              href={mailtoUrl}
              className="h-10 px-3.5 rounded-full text-xs font-bold bg-white text-ink border border-ink/20 hover:border-ink/50 transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t.draftDialog.sendEmail}</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
