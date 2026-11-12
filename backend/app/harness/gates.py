"""게이트 3개(harness.yaml gates): evidence(근거), wording(금지·단정 표현), privacy(개인정보 모양).
막힌 주장은 blocked=true. 요약 검사(check_summary)는 주장에 없는 숫자와 같은 표현 규칙을 본다."""
from __future__ import annotations

import re
import unicodedata

from app.contracts import Claim
from app.tools.data import forbidden_phrases, source_ids

NUM_RE = re.compile(r"\d[\d,]*(?:\.\d+)?")
NUMBER_OK_KINDS = {"dataset", "calc", "input", "assumption"}
DB_TABLES = {"orders"}          # evidence-rules: dataset ref는 sources.json id 또는 DB 표
PHONE_RE = re.compile(r"(?<!\d)0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}(?!\d)|(?<!\d)0\d{9,10}(?!\d)"
                      r"|\+\d{1,3}[-.\s]?\(?\d{1,4}\)?(?:[-.\s]?\d{2,4}){2,3}(?!\d)"
                      r"|(?<!\d)1[5-9]\d{2}[-.\s]\d{4}(?!\d)")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
RRN_RE = re.compile(r"(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)")
ASSERTIVE_RE = re.compile(r"무조건|반드시|확실히|틀림없|100\s*%|보장")       # 단정 표현

# 한글 수 표현("다섯 명", "삼만 원")도 숫자로 센다
_SINO = "[일이삼사오육칠팔구]"
_KO_NUM = (rf"(?<![가-힣])(?:(?:{_SINO}?[십백천만억])+{_SINO}?|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|스물|서른|마흔|쉰|하나|둘|셋|넷)"
           r"\s?(?:퍼센트|프로|배|킬로미터|킬로|미터|원|개|곳|군데|명|분|인분|%)")
KO_NUM_RE = re.compile(_KO_NUM + r"(?:(?![가-힣])|(?=[을를이가은는의에로과와도만씩쯤이요]))")
SENT_SPLIT_RE = re.compile(r"(?<=[.!?。])\s+|\n+")
ZERO_WIDTH_RE = re.compile(r"[​-‏⁠﻿]")
CITE_RE = re.compile(r"\s*\[[a-z_]+:\d+\]")


def _norm(text: str) -> str:
    return ZERO_WIDTH_RE.sub("", unicodedata.normalize("NFKC", text))


def numbers(text: str) -> set[str]:
    nums = {n.replace(",", "").rstrip(".") for n in NUM_RE.findall(text)}
    return nums | {m.group(0).replace(" ", "") for m in KO_NUM_RE.finditer(text)}


def split_sentences(text: str) -> list[str]:
    text = re.sub(r"(?<=[.!?])(?=[가-힣])", " ", text)
    return [p.strip() for p in SENT_SPLIT_RE.split(text) if p.strip()]


def evidence_reasons(c: Claim) -> list[str]:
    if not c.evidence:
        return ["evidence: 근거 없음"]
    r: list[str] = []
    known = source_ids() | DB_TABLES
    for e in c.evidence:
        if e.kind == "dataset" and e.ref not in known:
            r.append(f"evidence: 없는 데이터셋 id {e.ref}")
    kinds = {e.kind for e in c.evidence}
    if numbers(c.text) and not (kinds & NUMBER_OK_KINDS):
        r.append("evidence: 숫자가 있는데 dataset/calc/input/assumption 근거 없음")
    if c.level in ("estimate", "assumption") and not (kinds & {"assumption", "calc"}):
        r.append("evidence: estimate/assumption 주장에 assumption/calc 근거 없음")
    return r


def text_reasons(text: str) -> list[str]:
    t = _norm(text)
    r: list[str] = [f"wording: 금지 표현 '{ph}'" for ph in forbidden_phrases() if ph in t]
    if not r and ASSERTIVE_RE.search(t):
        r.append("wording: 단정 표현")
    if PHONE_RE.search(t):
        r.append("privacy: 전화번호 모양")
    if EMAIL_RE.search(t):
        r.append("privacy: 이메일 모양")
    if RRN_RE.search(t):
        r.append("privacy: 주민번호 모양")
    return r


def apply_gates(claims: list[Claim]) -> tuple[list[Claim], int]:
    """각 주장에 게이트 적용. (통과한 주장 목록, 막힌 수). 원본 claim.blocked/block_reasons도 채운다."""
    public, blocked = [], 0
    for c in claims:
        reasons = evidence_reasons(c) + text_reasons(c.text)
        if reasons:
            c.blocked, c.block_reasons = True, reasons
            blocked += 1
        else:
            public.append(c)
    return public, blocked


def check_summary(text: str, public_claims: list[Claim]) -> list[str]:
    """요약 글 검사: 주장에 없는 숫자(한글 수 표현 포함), 금지·단정 표현, 개인정보."""
    allowed: set[str] = set()
    for c in public_claims:
        allowed |= numbers(c.text)
    body = CITE_RE.sub("", text)
    r = [f"provenance: 주장에 없는 숫자 {n}" for n in sorted(numbers(body) - allowed)]
    return r + text_reasons(text)


def clean_llm_text(text: str) -> str:
    """LLM 글에서 [에이전트:번호] 인용 꼬리표와 남은 찌꺼기(겹친 쉼표·공백)를 정리."""
    t = CITE_RE.sub("", text)
    t = re.sub(r"\s+([,.])", r"\1", t)
    t = re.sub(r",(?:\s*,)+", ",", t)
    t = re.sub(r"\.{2,}", ".", t)
    keep = [s.strip(" ,") for s in split_sentences(t)]
    keep = [s for s in keep if len(re.sub(r"[\W_]", "", s)) >= 2]
    return re.sub(r"[ \t]{2,}", " ", " ".join(keep)).strip()


ENDING_BIGRAMS = {"어요", "해요", "에요", "예요", "세요", "습니", "니다", "있어", "드려", "드릴"}   # 어미는 근거 일치로 세지 않는다
MIN_GROUNDED = 0.5


def _ko_bigrams(text: str) -> set[str]:
    return ({run[i:i + 2] for run in re.findall(r"[가-힣]{2,}", text) for i in range(len(run) - 1)} - ENDING_BIGRAMS
            | set(re.findall(r"[a-z]{2,}", text.lower())))


def strip_ungrounded(text: str, sources: list[str]) -> tuple[str, list[str]]:
    """대화 요약에서 글자쌍 절반 이상이 근거 항목에 없는 문장(지어낸 문장, 질문 베끼기)을 뺀다."""
    known = _ko_bigrams(" ".join(sources))
    keep, dropped = [], []
    for sent in split_sentences(text):
        grams = _ko_bigrams(sent)
        off = grams and len(grams & known) / len(grams) < MIN_GROUNDED
        (dropped.append("근거 밖 문장") if off else keep.append(sent))
    return " ".join(keep), dropped
