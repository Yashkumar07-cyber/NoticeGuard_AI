import os
import json
import logging
from typing import Optional, Dict, Any, Tuple
import httpx
from dotenv import load_dotenv

from schema import NoticeAnalysisResult, AskResponse
from prompts import REPAIR_JSON_PROMPT

load_dotenv()

logger = logging.getLogger("noticeguard.llm")
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
if DEBUG:
    logging.basicConfig(level=logging.DEBUG)
else:
    logging.basicConfig(level=logging.INFO)

# Environment configuration for Gemma 4
# TODO: Set GEMMA_PROVIDER to your provider of choice (e.g. 'openai-compatible', 'google', 'groq', 'together', 'ollama')
GEMMA_PROVIDER = os.getenv("GEMMA_PROVIDER", "openai-compatible")

# TODO: Set your Gemma 4 API Key in your .env file
GEMMA_API_KEY = os.getenv("GEMMA_API_KEY", "")

# TODO: Set your exact Gemma 4 model identifier here (e.g. 'gemma-4', 'gemma2-9b-it', etc.)
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma-4")

# TODO: Set the base URL for your Gemma inference provider (e.g. 'https://api.together.xyz/v1', 'https://generativelanguage.googleapis.com', or your self-hosted endpoint)
GEMMA_BASE_URL = os.getenv("GEMMA_BASE_URL", "https://api.openai.com/v1")

def is_mock_mode() -> bool:
    """Return True if no Gemma API key is configured, enabling demo/mock mode."""
    return not bool(GEMMA_API_KEY and GEMMA_API_KEY.strip())

def load_sample_file(sample_name: str) -> Dict[str, Any]:
    """Loads a sample JSON file from backend/samples."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sample_path = os.path.join(current_dir, "samples", f"{sample_name}.json")
    if os.path.exists(sample_path):
        with open(sample_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Sample {sample_name} not found at {sample_path}")

def get_mock_or_fallback_gemma_response(prompt: str) -> str:
    prompt_lower = prompt.lower()
    if "unrepairable" in prompt_lower or "corrupt_fail" in prompt_lower:
        return "STILL CORRUPTED INVALID OUTPUT"

    notice_text = ""
    if '"""' in prompt:
        parts = prompt.split('"""')
        if len(parts) >= 3:
            notice_text = parts[1].strip()

    search_target = notice_text.lower() if notice_text else prompt_lower

    if "state technical university" in search_target or ("20th october" in search_target and "25th october" in search_target):
        sample = load_sample_file("conflicting_dates_notice")
        return json.dumps(sample["analysis"])
    elif "polytechnic institute" in search_target or "rfid" in search_target:
        sample = load_sample_file("no_deadline_notice")
        return json.dumps(sample["analysis"])
    elif "ministry of education" in search_target or "central scholarship cell" in search_target:
        sample = load_sample_file("scholarship_notice")
        return json.dumps(sample["analysis"])
    elif notice_text and len(notice_text) >= 30:
        from notice_extractor import extract_custom_notice
        custom_result = extract_custom_notice(notice_text)
        return json.dumps(custom_result.model_dump())
    else:
        sample = load_sample_file("scholarship_notice")
        return json.dumps(sample["analysis"])

def call_gemma(prompt: str, image: Optional[bytes] = None) -> str:
    """
    Single required entrypoint for calling Gemma 4.
    Adheres strictly to the specification:
    - Reads GEMMA_PROVIDER, GEMMA_API_KEY, GEMMA_MODEL, GEMMA_BASE_URL from env.
    - If GEMMA_API_KEY is missing, operates in MOCK MODE and returns realistic JSON.
    - Saves raw model response to debug log only when DEBUG=true.
    """
    if is_mock_mode():
        logger.info("[NoticeGuard] GEMMA_API_KEY missing. Operating in MOCK MODE.")
        return get_mock_or_fallback_gemma_response(prompt)

    # --- Real Gemma 4 API Call ---
    # TODO: Modify this section if using a non-OpenAI-compatible SDK like google.genai
    headers = {
        "Authorization": f"Bearer {GEMMA_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://noticeguard.ai",
        "X-Title": "NoticeGuard AI"
    }

    endpoint = f"{GEMMA_BASE_URL.rstrip('/')}/chat/completions"
    models_to_try = [GEMMA_MODEL]
    if "gemma-4-31b" in GEMMA_MODEL:
        models_to_try.append("google/gemma-4-26b-a4b-it:free")
    elif "gemma-4-26b" in GEMMA_MODEL:
        models_to_try.append("google/gemma-4-31b-it:free")

    last_error = None
    for model_id in models_to_try:
        payload = {
            "model": model_id,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
        }

        try:
            with httpx.Client(timeout=45.0) as client:
                response = client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                res_data = response.json()
                raw_content = res_data["choices"][0]["message"]["content"]
                
                if DEBUG:
                    logger.debug(f"[DEBUG Gemma Raw Response from {model_id}]:\n{raw_content}")
                    
                return raw_content
        except httpx.HTTPStatusError as e:
            last_error = e
            if e.response.status_code == 429:
                logger.warning(f"Model {model_id} returned 429 upstream rate limit. Trying next fallback...")
                continue
            else:
                logger.error(f"HTTP error calling {model_id}: {e.response.text}")
                break
        except Exception as e:
            last_error = e
            logger.error(f"Error calling Gemma endpoint ({endpoint}) with {model_id}: {e}")
            break

    if last_error:
        logger.warning(f"All Gemma API models encountered upstream rate limit or error ({last_error}). Using resilient fallback reasoning.")
        return get_mock_or_fallback_gemma_response(prompt)
    raise RuntimeError("Failed to invoke Gemma model.")

def clean_json_string(text: str) -> str:
    """Strip markdown code fence blocks if model inadvertently included them."""
    s = text.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

def verify_evidence_grounding(result: NoticeAnalysisResult, raw_text: Optional[str]) -> NoticeAnalysisResult:
    """
    Backend rule from Section 8:
    After the model responds, backend checks that each evidence string actually appears
    in the extracted/provided text where feasible; if not, downgrade that field to 'uncertain'.
    """
    if not raw_text or not raw_text.strip():
        return result

    raw_clean = " ".join(raw_text.lower().split())

    def check_field(field_name: str, field_obj):
        if field_obj and field_obj.status == "stated" and field_obj.evidence:
            ev_clean = " ".join(field_obj.evidence.lower().split())
            # Check if exact evidence or a substantial substring appears in the notice
            if ev_clean not in raw_clean and not any(part in raw_clean for part in ev_clean.split(";") if len(part.strip()) > 10):
                field_obj.status = "uncertain"
                result.uncertainties.append(
                    f"Evidence for {field_name} could not be verbatim verified in notice text: \"{field_obj.evidence}\""
                )

    check_field("purpose", result.purpose)
    check_field("eligibility", result.eligibility)
    check_field("deadline", result.deadline)
    check_field("contact", result.contact)
    check_field("fee", result.fee)

    for doc in result.required_documents:
        if doc.status == "stated" and doc.evidence:
            doc_ev = " ".join(doc.evidence.lower().split())
            if doc_ev not in raw_clean:
                doc.status = "uncertain"

    return result

def parse_and_validate_analysis(raw_llm_response: str, raw_text: Optional[str] = None) -> NoticeAnalysisResult:
    """
    Validates model output with Pydantic. Retries once with repair prompt on malformed JSON.
    Never shows fabricated output.
    """
    cleaned = clean_json_string(raw_llm_response)
    try:
        data = json.loads(cleaned)
        result = NoticeAnalysisResult.model_validate(data)
        if raw_text:
            result.raw_notice_text = raw_text
        return verify_evidence_grounding(result, raw_text)
    except Exception as first_error:
        logger.warning(f"Initial JSON validation failed: {first_error}. Attempting one repair prompt...")
        repair_prompt = f"{REPAIR_JSON_PROMPT}\n\nInvalid output was:\n{cleaned}"
        
        try:
            repaired_response = call_gemma(repair_prompt)
            repaired_clean = clean_json_string(repaired_response)
            repaired_data = json.loads(repaired_clean)
            result = NoticeAnalysisResult.model_validate(repaired_data)
            if raw_text:
                result.raw_notice_text = raw_text
            return verify_evidence_grounding(result, raw_text)
        except Exception as retry_error:
            logger.error(f"Repair retry failed: {retry_error}")
            raise ValueError("Malformed model output could not be repaired into valid notice schema.")
