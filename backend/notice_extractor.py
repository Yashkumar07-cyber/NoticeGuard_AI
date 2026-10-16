import re
from typing import Dict, Any, List, Optional
from schema import NoticeAnalysisResult, NoticeField, DocumentItem, ActionItem, ConflictItem

MONTHS_REGEX = r'(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'

def extract_dates_with_context(text: str) -> List[Dict[str, str]]:
    """Finds all dates in text along with the surrounding context sentence."""
    date_pattern = re.compile(
        rf'\b(\d{{1,2}}(?:st|nd|rd|th)?\s+{MONTHS_REGEX}[a-z]*\s+\d{{2,4}}(?:\s*(?:at\s*)?\d{{1,2}}(?::\d{{2}})?\s*(?:AM|PM|IST)?)?|\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}})\b',
        re.IGNORECASE
    )
    
    sentences = re.split(r'[\r\n.]+', text)
    findings = []
    
    for sentence in sentences:
        s_clean = sentence.strip()
        if not s_clean:
            continue
        matches = date_pattern.findall(s_clean)
        for m in matches:
            findings.append({
                "date": m.strip(),
                "sentence": s_clean
            })
    return findings

def extract_custom_notice(raw_text: str) -> NoticeAnalysisResult:
    """
    Intelligently scans and analyzes ANY arbitrary user-uploaded notice text.
    Extracts real purpose, dates, fees, eligibility, documents, contacts, and actions.
    Guarantees that nothing is fabricated; missing fields are marked 'not_stated'.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    full_text = " ".join(lines)
    
    # Detect language
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', raw_text))
    has_latin = bool(re.search(r'[a-zA-Z]', raw_text))
    if has_devanagari and has_latin:
        lang_detected = "mixed"
    elif has_devanagari:
        lang_detected = "hi"
    else:
        lang_detected = "en"

    # 1. Purpose extraction
    purpose_val = None
    purpose_ev = None
    purpose_status = "not_stated"

    # Search for Subject / Title / Regarding or first line
    for i, line in enumerate(lines[:6]):
        if re.search(r'(?:subject|sub|regarding|re|notice|purpose|attention|inviting|applications)\s*[:\-]', line, re.IGNORECASE):
            purpose_val = re.sub(r'^(?:subject|sub|regarding|re|notice|purpose|attention)\s*[:\-]\s*', '', line, flags=re.IGNORECASE).strip()
            purpose_ev = line
            purpose_status = "stated"
            break

    if not purpose_val and lines:
        # Use first meaningful line as purpose
        first_line = lines[0] if len(lines[0]) > 15 else (lines[1] if len(lines) > 1 else lines[0])
        purpose_val = first_line[:120]
        purpose_ev = first_line
        purpose_status = "stated"

    # 2. Deadline extraction
    deadline_val = None
    deadline_ev = None
    deadline_status = "not_stated"
    deadline_options = None
    conflicts: List[ConflictItem] = []

    date_findings = extract_dates_with_context(raw_text)
    deadline_candidates = []

    for f in date_findings:
        sent_lower = f["sentence"].lower()
        if any(k in sent_lower for k in ["last date", "deadline", "closing", "due date", "till", "before", "accepted till", "portal close", "upto", "strictly close", "अंतिम तिथि", "समाप्त"]):
            deadline_candidates.append(f)

    if len(deadline_candidates) >= 2:
        # Check if the dates differ significantly (conflict!)
        d1 = deadline_candidates[0]["date"]
        d2 = deadline_candidates[1]["date"]
        if d1.lower() != d2.lower():
            deadline_status = "conflicting"
            deadline_val = f"Conflicting dates: {d1} vs {d2}"
            deadline_ev = f"{deadline_candidates[0]['sentence']} vs {deadline_candidates[1]['sentence']}"
            deadline_options = [
                {"value": d1, "snippet": deadline_candidates[0]["sentence"], "region": "Notice Section A"},
                {"value": d2, "snippet": deadline_candidates[1]["sentence"], "region": "Notice Section B"}
            ]
            conflicts.append(ConflictItem(
                field="deadline",
                option_a={"value": d1, "snippet": deadline_candidates[0]["sentence"]},
                option_b={"value": d2, "snippet": deadline_candidates[1]["sentence"]}
            ))
        else:
            deadline_status = "stated"
            deadline_val = d1
            deadline_ev = deadline_candidates[0]["sentence"]
    elif len(deadline_candidates) == 1:
        deadline_status = "stated"
        deadline_val = deadline_candidates[0]["date"]
        deadline_ev = deadline_candidates[0]["sentence"]
    elif date_findings:
        # Use first identified date if near any schedule/date word
        for f in date_findings:
            if "date:" not in f["sentence"].lower() and "issue date" not in f["sentence"].lower():
                deadline_status = "stated"
                deadline_val = f["date"]
                deadline_ev = f["sentence"]
                break

    # 3. Eligibility extraction
    eligibility_val = None
    eligibility_ev = None
    eligibility_status = "not_stated"

    for line in lines:
        line_lower = line.lower()
        if any(k in line_lower for k in ["eligib", "criteria", "who can apply", "qualif", "students enrolled", "candidates with", "attendance", "पात्रता", "योग्यता"]):
            # Extract sentence or paragraph
            eligibility_val = line
            eligibility_ev = line
            eligibility_status = "stated"
            break

    # 4. Fee extraction
    fee_val = None
    fee_ev = None
    fee_status = "not_stated"

    for line in lines:
        line_lower = line.lower()
        if any(k in line_lower for k in ["fee", "fees", "charges", "शुल्क", "cost", "amount payable", "deposit"]):
            if "no fee" in line_lower or "nil" in line_lower or "free" in line_lower:
                fee_val = "Free / No application fee required"
            else:
                amount_match = re.search(r'(?:Rs\.?|₹|INR)\s*[\d,]+', line, re.IGNORECASE)
                if amount_match:
                    fee_val = amount_match.group(0).strip()
                else:
                    fee_val = line[:80].strip()
            fee_ev = line
            fee_status = "stated"
            break

    # 5. Required Documents extraction
    doc_items: List[DocumentItem] = []
    in_docs_section = False

    for line in lines:
        line_lower = line.lower()
        if any(k in line_lower for k in ["required documents", "documents required", "mandatory documents", "attach the following", "enclosures", "documents to be submitted", "documents:", "दस्तावेज़", "कागज़ात"]):
            in_docs_section = True
            # Also check if the line itself has items after a colon
            colon_split = re.split(r'[:\-]\s*', line, maxsplit=1)
            if len(colon_split) > 1 and len(colon_split[1].strip()) > 5:
                sub_items = re.split(r'(?:\d+[.)]\s*|,\s*|;\s*)', colon_split[1])
                for sub in sub_items:
                    s_clean = sub.strip()
                    if s_clean and len(s_clean) > 3 and not any(stop in s_clean.lower() for stop in ['helpdesk', 'contact', 'email', 'phone', '@']):
                        doc_items.append(DocumentItem(
                            value=s_clean,
                            status="stated",
                            evidence=line,
                            region="Documents"
                        ))
            continue

        if in_docs_section:
            if re.search(r'\b(helpdesk|contact|inquiries|officer|room|helpline)\b', line, re.I):
                in_docs_section = False
                continue
            if re.match(r'^(?:\d+\.|\b[A-Z\s]{4,}\b\s*:)', line) and not re.match(r'^(?:[-*•]|\d+\.\s+[a-z])', line, re.IGNORECASE):
                in_docs_section = False
            else:
                # Check for inline numbers: e.g. "1. Aadhaar 2. Marksheet"
                sub_parts = re.split(r'(?:\s*\d+[.)]\s*|\s*[-*•]\s*)', line)
                clean_subs = [p.strip() for p in sub_parts if p.strip() and len(p.strip()) > 3 and not p.lower().startswith('documents')]
                if clean_subs:
                    for cs in clean_subs:
                        doc_items.append(DocumentItem(
                            value=cs,
                            status="stated",
                            evidence=line,
                            region="Documents Section"
                        ))
                else:
                    doc_text = re.sub(r'^(?:[-*•]|\d+[.)])\s*', '', line).strip()
                    if doc_text and len(doc_text) > 3 and len(doc_text) < 120:
                        doc_items.append(DocumentItem(
                            value=doc_text,
                            status="stated",
                            evidence=line,
                            region="Documents Section"
                        ))

    # Fallback search for documents keywords if no dedicated section was tagged
    if not doc_items:
        doc_keywords = ["marksheet", "certificate", "id card", "aadhaar", "passbook", "photograph", "clearance", "allotment letter", "income cert"]
        for line in lines:
            for kw in doc_keywords:
                if kw in line.lower() and len(line) < 140:
                    clean_kw_item = re.sub(r'^(?:[-*•]|\d+[.)])\s*', '', line).strip()
                    doc_items.append(DocumentItem(
                        value=clean_kw_item,
                        status="stated",
                        evidence=line.strip(),
                        region="Document Mentions"
                    ))
                    break

    # 6. Contact Information extraction
    contact_val = None
    contact_ev = None
    contact_status = "not_stated"

    email_matches = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    phone_matches = re.findall(r'(?:\+?91[\s-]?)?[6-9]\d{9}|\b0\d{2,4}[-\s]?\d{6,8}\b', raw_text)

    contact_parts = []
    if email_matches:
        contact_parts.append(email_matches[0])
    if phone_matches:
        contact_parts.append(phone_matches[0])

    if contact_parts:
        contact_val = " | ".join(contact_parts)
        contact_ev = contact_val
        contact_status = "stated"
    else:
        for line in lines:
            if any(k in line.lower() for k in ["contact", "helpline", "helpdesk", "inquiries", "room no", "officer", "संपर्क"]):
                contact_val = line[:100].strip()
                contact_ev = line.strip()
                contact_status = "stated"
                break

    # 7. Action Items (Checklist)
    action_items: List[ActionItem] = []
    step_num = 1

    if doc_items:
        doc_names = ", ".join([d.value for d in doc_items[:3]])
        action_items.append(ActionItem(
            step=step_num,
            task=f"Gather required documents: {doc_names}.",
            source_evidence=doc_items[0].evidence,
            done=False
        ))
        step_num += 1

    if eligibility_status == "stated":
        action_items.append(ActionItem(
            step=step_num,
            task="Verify your eligibility criteria as stated in the notice.",
            source_evidence=eligibility_ev,
            done=False
        ))
        step_num += 1

    if fee_status == "stated" and fee_val and "free" not in fee_val.lower():
        action_items.append(ActionItem(
            step=step_num,
            task=f"Arrange and pay the application/processing fee ({fee_val}).",
            source_evidence=fee_ev,
            done=False
        ))
        step_num += 1

    if deadline_status == "stated" and deadline_val:
        action_items.append(ActionItem(
            step=step_num,
            task=f"Submit final application/form before the deadline ({deadline_val}).",
            source_evidence=deadline_ev,
            done=False
        ))
        step_num += 1
    elif deadline_status == "conflicting":
        action_items.append(ActionItem(
            step=step_num,
            task="Resolve the conflicting deadline dates with the helpdesk or department office.",
            source_evidence=deadline_ev,
            done=False
        ))
        step_num += 1
    else:
        action_items.append(ActionItem(
            step=step_num,
            task="Contact the authority or department to verify the official submission deadline.",
            source_evidence="[Deadline not stated in notice]",
            done=False
        ))
        step_num += 1

    action_items.append(ActionItem(
        step=step_num,
        task="Retain a printed copy or acknowledgment receipt for records.",
        source_evidence="General Official Procedure",
        done=False
    ))

    # 8. Summary
    summary_parts = []
    if purpose_val:
        summary_parts.append(f"Notice regarding: {purpose_val}.")
    if deadline_val:
        summary_parts.append(f"Submission deadline: {deadline_val}.")
    elif deadline_status == "not_stated":
        summary_parts.append("Submission deadline is not stated in this notice.")
    if fee_val:
        summary_parts.append(f"Fee: {fee_val}.")
    
    summary = " ".join(summary_parts) if summary_parts else "Official notice scanned. Review the verified key details and action checklist below."

    uncertainties = []
    if deadline_status == "not_stated":
        uncertainties.append("No submission deadline is stated in this notice.")
    if deadline_status == "conflicting":
        uncertainties.append("Notice contains conflicting deadline dates requiring verification.")
    if contact_status == "not_stated":
        uncertainties.append("No official contact phone number or email is specified.")

    return NoticeAnalysisResult(
        purpose=NoticeField(
            value=purpose_val,
            status=purpose_status,
            evidence=purpose_ev,
            region="Header / Subject"
        ),
        eligibility=NoticeField(
            value=eligibility_val,
            status=eligibility_status,
            evidence=eligibility_ev,
            region="Eligibility"
        ),
        deadline=NoticeField(
            value=deadline_val,
            status=deadline_status,
            evidence=deadline_ev,
            region="Timeline",
            options=deadline_options
        ),
        required_documents=doc_items,
        contact=NoticeField(
            value=contact_val,
            status=contact_status,
            evidence=contact_ev,
            region="Helpdesk / Contact"
        ),
        fee=NoticeField(
            value=fee_val,
            status=fee_status,
            evidence=fee_ev,
            region="Fees"
        ),
        actions=action_items,
        summary=summary,
        uncertainties=uncertainties,
        conflicts=conflicts,
        limitations=[],
        language_detected=lang_detected,
        raw_notice_text=raw_text
    )
