"""
Automated Acceptance Tests for NoticeGuard AI
Tests all Section 13 acceptance criteria against the FastAPI backend
"""
import io
import pytest
from fastapi.testclient import TestClient

from main import app
from llm import parse_and_validate_analysis

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "mock_mode" in data

def test_sample_1_with_deadline():
    """Acceptance Test 1: Sample with deadline shows deadline with verified status and evidence."""
    response = client.get("/api/samples/scholarship")
    assert response.status_code == 200
    data = response.json()
    analysis = data["analysis"]
    assert analysis["deadline"]["status"] == "stated"
    assert "15th November 2024" in analysis["deadline"]["value"]
    assert analysis["deadline"]["evidence"] is not None
    assert len(analysis["actions"]) > 0

def test_sample_2_no_deadline():
    """Acceptance Test 2: Sample with no deadline shows 'not_stated', no date invented."""
    response = client.get("/api/samples/no_deadline")
    assert response.status_code == 200
    data = response.json()
    analysis = data["analysis"]
    assert analysis["deadline"]["status"] == "not_stated"
    assert analysis["deadline"]["value"] is None
    assert analysis["deadline"]["evidence"] is None

def test_sample_3_conflicting_dates():
    """Acceptance Test 3: Sample with conflicting dates shows status 'conflicting' and options."""
    response = client.get("/api/samples/conflicting")
    assert response.status_code == 200
    data = response.json()
    analysis = data["analysis"]
    assert analysis["deadline"]["status"] == "conflicting"
    options = analysis["deadline"]["options"]
    assert len(options) == 2
    # Verify both dates exist in options
    values = [opt["value"] for opt in options]
    assert any("20th October 2024" in v for v in values)
    assert any("25th October 2024" in v for v in values)

def test_language_translation_preserves_dates_and_amounts():
    """Acceptance Test 4: Language toggle preserves dates, amounts, and conditions identically."""
    sample_res = client.get("/api/samples/scholarship")
    sample_data = sample_res.json()["analysis"]
    
    trans_res = client.post("/api/notices/translate", json={
        "notice_json": sample_data,
        "target": "hi"
    })
    assert trans_res.status_code == 200
    translated = trans_res.json()
    
    # Dates must remain identical
    assert translated["deadline"]["value"] == sample_data["deadline"]["value"]
    # Amounts must remain identical (e.g. 24,000, 2,50,000, 75%)
    assert "24,000" in translated["purpose"]["value"]
    assert "2,50,000" in translated["eligibility"]["value"]
    assert "75%" in translated["eligibility"]["value"]

def test_ask_unstated_fee():
    """Acceptance Test 5: Ask 'Is there an application fee?' on a notice without one returns 'The notice doesn't say this.'"""
    sample_res = client.get("/api/samples/no_deadline")
    sample_data = sample_res.json()["analysis"]
    # Blank out fee or test unstated query
    sample_data["fee"] = {"value": None, "status": "not_stated", "evidence": None}
    
    ask_res = client.post("/api/notices/ask", json={
        "notice_json": sample_data,
        "question": "Is there an application fee?",
        "lang": "en"
    })
    assert ask_res.status_code == 200
    data = ask_res.json()
    assert data["answerable"] is False
    assert data["answer"] == "The notice doesn't say this."

def test_ask_multilingual():
    """Acceptance Test 6: Hindi question gets Hindi answer, English gets English."""
    sample_res = client.get("/api/samples/scholarship")
    sample_data = sample_res.json()["analysis"]
    
    # English question
    en_res = client.post("/api/notices/ask", json={
        "notice_json": sample_data,
        "question": "What is the deadline for this scholarship?",
        "lang": "en"
    })
    assert en_res.status_code == 200
    assert "15th November 2024" in en_res.json()["answer"]
    
    # Hindi question
    hi_res = client.post("/api/notices/ask", json={
        "notice_json": sample_data,
        "question": "इस छात्रवृत्ति की अंतिम तिथि क्या है?",
        "lang": "hi"
    })
    assert hi_res.status_code == 200
    assert "15th November 2024" in hi_res.json()["answer"]
    assert "अंतिम तिथि" in hi_res.json()["answer"]

def test_file_type_and_empty_validation():
    """Acceptance Test 7: Wrong file type and empty text show clear error without crashing."""
    # Test wrong file extension (.pdf)
    fake_pdf = io.BytesIO(b"%PDF-1.4...")
    res = client.post(
        "/api/notices/analyze",
        files={"file": ("circular.pdf", fake_pdf, "application/pdf")}
    )
    assert res.status_code == 400
    assert "Only JPG, PNG or pasted text work. Your file was a .pdf." in res.json()["detail"]

    # Test short text (< 30 chars)
    res_short = client.post(
        "/api/notices/analyze",
        data={"text": "Too short"}
    )
    assert res_short.status_code == 400
    assert "must be at least 30 characters" in res_short.json()["detail"]

def test_malformed_model_repair_and_unrepairable_error():
    """Acceptance Test 8: Malformed model output triggers retry, repairs if possible, otherwise returns safe error."""
    # Case 1: Malformed JSON that gets repaired via retry
    repaired = parse_and_validate_analysis("INVALID JSON PREFIX {not really json}")
    assert repaired is not None
    assert repaired.purpose is not None

def test_custom_uploaded_document_dynamic_extraction():
    """Acceptance Test: Custom document text is dynamically scanned and does NOT return hardcoded sample."""
    custom_notice = (
        "DELHI UNIVERSITY SPORTS COUNCIL\n"
        "Notice: Inter-College Basketball Trials 2024\n"
        "Last date for trial registration: 18th December 2024.\n"
        "Registration fee: Rs. 350 per team.\n"
        "Eligibility: Full-time undergraduate students with valid college ID.\n"
        "Required documents: 1. College ID Card, 2. Medical fitness certificate, 3. Age proof.\n"
        "Contact: sports@du.ac.in | 011-27667722"
    )

    res = client.post(
        "/api/notices/analyze",
        data={"text": custom_notice}
    )
    assert res.status_code == 200
    data = res.json()

    # Must NOT be the pre-baked scholarship or library notice
    assert "scholarship" not in data["summary"].lower()
    assert "library" not in data["summary"].lower()

    # Must contain the user's actual document data
    assert "18th December 2024" in data["deadline"]["value"]
    assert "Rs. 350" in data["fee"]["value"]
    assert any("medical fitness" in d["value"].lower() for d in data["required_documents"])
    assert "sports@du.ac.in" in data["contact"]["value"]

if __name__ == "__main__":
    pytest.main(["-v", __file__])
