# NoticeGuard AI 📋🛡️

> Plain-language, evidence-backed action checklists for official notices, college circulars, scholarships, and public instructions in English and Hindi.

NoticeGuard AI turns confusing official notices into clear, verifiable checklists. It strictly adheres to what the notice actually says:
- **No Hallucinations:** Missing details explicitly display *"Not stated in this notice"*.
- **Uncertainty Guard:** Blurry or ambiguous items prompt for user confirmation.
- **Conflict Detection:** Conflicting deadlines or requirements are surfaced side-by-side for user resolution.
- **Multilingual:** Seamless English & Hindi support where dates, amounts, and conditions never drift in translation.

---

## 🛠️ Stack & Architecture

- **Frontend:** React 19 + Vite + Tailwind CSS.
- **3D Visuals:** Pure CSS 3D transforms (`perspective: 1400px`, `transform-style: preserve-3d`) + pointer parallax (no heavy 3D or WebGL dependencies; runs smoothly on mobile).
- **Backend:** Python FastAPI + Pydantic v2 validation.
- **AI Engine:** Gemma 4 via single entrypoint function `call_gemma(prompt, image=None)` in `backend/llm.py`.
- **Demo Mock Mode:** Built-in out-of-the-box demo mode with realistic sample notices when `GEMMA_API_KEY` is not provided.
- **Voice & Accessibility:** Web SpeechRecognition + SpeechSynthesis with fallback handling, WCAG AA contrast, 3px highlighter focus rings, and full keyboard navigation.
- **Zero Disk Persistence:** All sessions live strictly in memory; nothing is stored on disk.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ (tested on Node v24)
- npm 9+

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy environment variables template
cp ../.env.example .env

# Run FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API will be live at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

### 3. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Plugging in your Gemma 4 API Key

NoticeGuard AI provides a single entrypoint `call_gemma(prompt, image=None)` in `backend/llm.py`.

1. Open `backend/.env` (or copy from `.env.example`).
2. Configure the following environment variables:

```ini
GEMMA_PROVIDER=openai-compatible
GEMMA_API_KEY=your_gemma_api_key_here
GEMMA_MODEL=gemma-4
GEMMA_BASE_URL=https://api.together.xyz/v1  # or your Groq / Ollama / Google endpoint
DEBUG=false
```

If `GEMMA_API_KEY` is blank or omitted, the application automatically runs in **MOCK MODE** with a visible `"Demo data"` badge in the header, allowing testing of all features without an external key.

---

## 🧪 Acceptance Tests & Verification

| # | Test Scenario | Verified Behavior |
|---|---------------|-------------------|
| 1 | **Notice with Deadline** | Deadline shown with "See in notice" highlighting source with `#FFD93D` highlighter in 3D paper view; `.ics` download is enabled. |
| 2 | **Notice with No Deadline** | Deadline field shows `"Not stated in this notice"`. No date is invented. `.ics` download is disabled with a helpful tooltip. |
| 3 | **Notice with Conflicting Dates** | Displays both snippets side-by-side with `"Use this one"` button. User resolution logs to `"Your confirmations"`. |
| 4 | **Language Toggle** | Seamless switch between English and Hindi; all dates, numbers, amounts, and names remain identical. |
| 5 | **Strict Q&A Grounding** | Asking *"Is there an application fee?"* on a notice without one returns *"The notice doesn't say this."* |
| 6 | **Voice Input & Output** | Hindi spoken questions receive Hindi answers; English spoken questions receive English answers. |
| 7 | **Invalid Files & Input** | Uploading `.pdf` or empty text shows explicit error: *"Only JPG, PNG or pasted text work. Your file was a .pdf."* |
| 8 | **Guided Mode** | "Guide me" reads checklist step-by-step and listens for *"Next"*, *"Repeat"*, or *"Done"*. |

---

## ⚠️ Known Limitations

1. **Browser Speech Support:** SpeechRecognition depends on browser engine support (e.g., Google Chrome / Edge). On unsupported browsers, the mic gracefully hides and indicates voice is unavailable while keeping text input fully functional.
2. **Device TTS Voices:** Hindi speech synthesis requires a device voice supporting `hi-IN`. If the user's OS has no Hindi voice installed, NoticeGuard AI presents a non-intrusive alert and keeps the text clearly visible.
3. **OCR on Multi-page PDFs:** As specified, this version accepts JPG, PNG images and pasted circular text. Multi-page PDF splitting should be converted to images prior to upload.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
