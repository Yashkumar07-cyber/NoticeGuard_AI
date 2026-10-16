// Generates and triggers download of an .ics calendar file for deadline reminders

export function generateAndDownloadIcs({ title, deadlineStr, description }) {
  // Parse date if possible or default to a reasonable target date
  let eventDate = new Date();
  
  // Try to parse common Indian notice date patterns (e.g., "15th November 2024", "25th October 2024", "15/11/2024")
  const safeStr = typeof deadlineStr === 'string' ? deadlineStr : (deadlineStr ? String(deadlineStr) : '');
  const cleaned = safeStr.replace(/(st|nd|rd|th)/gi, '').trim();
  const parsed = cleaned ? Date.parse(cleaned) : NaN;
  
  if (!isNaN(parsed)) {
    eventDate = new Date(parsed);
  } else {
    // If not directly parseable, set for 7 days ahead as fallback
    eventDate.setDate(eventDate.getDate() + 7);
  }

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const formatDateUtc = (d) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const nowStr = formatDateUtc(new Date());
  const startStr = formatDateUtc(eventDate);
  // End date is 1 hour after start
  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
  const endStr = formatDateUtc(endDate);

  const cleanTitle = (title || 'Official Notice Deadline').replace(/[\r\n]/g, ' ');
  const cleanDesc = (description || (safeStr ? `Notice Deadline: ${safeStr}. Created via NoticeGuard AI.` : 'Official notice reminder.')).replace(/[\r\n]/g, '\\n');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NoticeGuard AI//Notice Deadline Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:noticeguard-${Date.now()}@noticeguard.ai`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:DEADLINE: ${cleanTitle}`,
    `DESCRIPTION:${cleanDesc}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Notice submission deadline is tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'notice-deadline-reminder.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
