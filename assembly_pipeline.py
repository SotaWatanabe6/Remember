# =========================================================
# IMPORTS
# =========================================================
# !pip install pymupdf faiss-cpu assemblyai pytesseract python-docx supabase openai google-generativeai sentence-transformers moviepy pillow -q

import os
import base64
import shutil
import logging
import fitz
import faiss
import numpy as np
import assemblyai as aai

from PIL import Image
from docx import Document
from moviepy.editor import VideoFileClip
from sentence_transformers import SentenceTransformer
from supabase import create_client
from openai import OpenAI
import google.generativeai as genai

logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

# =========================================================
# CONFIG
# =========================================================

SUPABASE_URL = "https://tbpdhybqbjucoxdizlgw.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

ASSEMBLYAI_API_KEY = os.environ.get("ASSEMBLYAI_API_KEY", "")
OPENAI_API_KEY     = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY     = os.environ.get("GEMINI_API_KEY", "")

missing = [
    name for name, val in {
        "SUPABASE_KEY":       SUPABASE_KEY,
        "OPENAI_API_KEY":     OPENAI_API_KEY,
        "GEMINI_API_KEY":     GEMINI_API_KEY,
        "ASSEMBLYAI_API_KEY": ASSEMBLYAI_API_KEY,
    }.items()
    if not val or val.startswith("YOUR_")
]
if missing:
    raise ValueError(f"Missing or placeholder API keys: {', '.join(missing)}")

# =========================================================
# INIT CLIENTS
# =========================================================

supabase           = create_client(SUPABASE_URL, SUPABASE_KEY)
aai.settings.api_key = ASSEMBLYAI_API_KEY
openai_client      = OpenAI(api_key=OPENAI_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
index       = faiss.IndexFlatL2(384)

# =========================================================
# SCENE PROMPTS
# =========================================================

SCENE_PROMPTS = {
    "warm_to_deep":    "FIRST MEMORY emotional depth analysis",
    "scene_first":     "ORDINARY DAY narrative reconstruction",
    "relational_lens": "RELATIONSHIPS emotional mapping",
}

# =========================================================
# CONTENT THRESHOLDS  — tune these if needed
# =========================================================

# Text: minimum meaningful word count before we attempt analysis
MIN_WORDS_TEXT = 30

# Audio transcripts: even stricter (short recordings are rarely meaningful)
MIN_WORDS_AUDIO = 20

# Image: minimum file size in bytes (tiny files are icons / corrupt)
MIN_IMAGE_BYTES = 10_000

# =========================================================
# CONTENT QUALITY GATE
# =========================================================

class InsufficientContentError(ValueError):
    """Raised when content is too thin for meaningful analysis."""
    pass


def _word_count(text: str) -> int:
    return len(text.split())


def check_text_quality(text: str, source: str = "text", min_words: int = MIN_WORDS_TEXT):
    """
    Raise InsufficientContentError when the text is too short or generic
    to support meaningful emotional / narrative analysis.
    """
    words = _word_count(text)
    if words < min_words:
        raise InsufficientContentError(
            f"{source} has only {words} words (minimum {min_words}). "
            "Skipping analysis to prevent hallucination."
        )

    # Flag purely transactional / logistical documents
    TRANSACTIONAL_SIGNALS = [
        "tracking number", "usps", "fedex", "ups", "order number",
        "shipping label", "return label", "fulfillment center",
        "invoice", "purchase order", "bill of lading",
    ]
    lower = text.lower()
    hits = sum(1 for s in TRANSACTIONAL_SIGNALS if s in lower)
    if hits >= 2:
        raise InsufficientContentError(
            f"{source} appears to be a transactional/logistical document "
            f"({hits} commercial signals detected). "
            "No emotional or narrative content to analyse."
        )


def check_image_quality(path: str):
    """Raise InsufficientContentError for corrupt or suspiciously small images."""
    size = os.path.getsize(path)
    if size < MIN_IMAGE_BYTES:
        raise InsufficientContentError(
            f"Image too small ({size:,} bytes < {MIN_IMAGE_BYTES:,}). "
            "Likely an icon or corrupt file — skipping."
        )
    try:
        img = Image.open(path)
        img.verify()
    except Exception as e:
        raise InsufficientContentError(f"Image failed integrity check: {e}")

# =========================================================
# LOGGING
# =========================================================

def log(msg: str):
    print(f"\n{msg}\n")

# =========================================================
# TRANSCRIPTION
# =========================================================

def transcribe_audio(path: str) -> str:
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(punctuate=True, format_text=True)
    result = transcriber.transcribe(path, config=config)
    if not result.text or not result.text.strip():
        raise RuntimeError("AssemblyAI returned an empty transcription.")
    return result.text

# =========================================================
# FILE PROCESSORS
# =========================================================

def process_pdf(path: str) -> str:
    doc  = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    if not text.strip():
        raise ValueError("PDF has no extractable text.")
    return text


def process_docx(path: str) -> str:
    doc  = Document(path)
    text = "\n".join(p.text for p in doc.paragraphs)
    if not text.strip():
        raise ValueError("DOCX has no text.")
    return text


def process_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def process_video(path: str) -> str:
    clip = VideoFileClip(path)
    if clip.audio is None:
        raise ValueError("Video has no audio track.")
    temp_audio = "temp.wav"
    clip.audio.write_audiofile(temp_audio, verbose=False, logger=None)
    clip.close()
    return transcribe_audio(temp_audio)

# =========================================================
# IMAGE HELPERS
# =========================================================

def encode_image_base64(path: str) -> tuple:
    ext        = path.lower().rsplit(".", 1)[-1]
    media_type = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8"), media_type

# =========================================================
# SYSTEM PROMPT  — shared anti-hallucination instruction
# =========================================================

SYSTEM_PROMPT = """\
You are a deep emotional intelligence system.

STRICT RULES — follow without exception:
1. Only analyse what is ACTUALLY present in the content. Never invent, speculate,
   or pad with plausible-sounding filler.
2. If a category (emotions, relationships, personality, narrative, meaning) has NO
   evidence in the content, respond for that field with exactly: null
3. If the content is too thin, transactional, or ambiguous to support a field,
   respond with: null
4. Do NOT use phrases like "could suggest", "might imply", or "possibly indicates"
   when there is no real evidence. Use null instead.
5. Your analysis must be directly traceable to specific words, phrases, or visual
   elements in the content.
"""

# =========================================================
# GPT-4o VISION
# =========================================================

def analyze_gpt4o_vision(image_path: str, scene: str) -> str:
    check_image_quality(image_path)          # ← quality gate
    b64, media_type = encode_image_base64(image_path)

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url":    f"data:{media_type};base64,{b64}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Scene context: {SCENE_PROMPTS.get(scene, '')}\n\n"
                            "Analyse this image. For each field below, respond only "
                            "with what you can DIRECTLY observe. Use null if there "
                            "is no evidence.\n\n"
                            "1. EMOTIONS — emotions present or clearly implied\n"
                            "2. RELATIONSHIPS — visible relationships between subjects\n"
                            "3. PERSONALITY — personality traits with visual evidence\n"
                            "4. NARRATIVE — the moment or story this captures\n"
                            "5. MEANING — deeper significance if clearly present\n\n"
                            "Do not invent details."
                        ),
                    },
                ],
            },
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content

# =========================================================
# GPT-4o TEXT  (audio / pdf / docx / txt)
# =========================================================

def analyze_gpt4o_text(text: str, scene: str, source: str = "text") -> str:
    # ← quality gate (audio gets a stricter threshold)
    min_w = MIN_WORDS_AUDIO if source == "audio" else MIN_WORDS_TEXT
    check_text_quality(text, source=source, min_words=min_w)

    prompt = (
        f"Scene context: {SCENE_PROMPTS.get(scene, '')}\n\n"
        "Analyse the following content. For each field, respond only with what is "
        "DIRECTLY present. Use null if there is no evidence in the text.\n\n"
        "Fields: Emotions | Relationships | Personality | Narrative | Meaning\n\n"
        f"CONTENT:\n{text[:8000]}"
    )
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content

# =========================================================
# GEMINI FALLBACK  (text only)
# =========================================================

def analyze_gemini(text: str, scene: str) -> str:
    prompt = (
        f"Scene context: {SCENE_PROMPTS.get(scene, '')}\n\n"
        f"{SYSTEM_PROMPT}\n\n"
        "Analyse the following content. Use null for any field lacking evidence.\n\n"
        "Fields: Emotions | Relationships | Personality | Narrative | Meaning\n\n"
        f"CONTENT:\n{text[:8000]}"
    )
    model    = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    if not response or not response.text:
        raise ValueError("Empty Gemini response")
    return response.text

# =========================================================
# ANALYSIS ROUTER
# =========================================================

def analyze(file_path: str, scene: str, is_image: bool, text: str,
            source: str = "text") -> str:
    log("Running GPT-4o analysis...")

    # --- primary ---
    try:
        if is_image:
            gpt4o_result = analyze_gpt4o_vision(file_path, scene)
        else:
            gpt4o_result = analyze_gpt4o_text(text, scene, source=source)
    except InsufficientContentError as e:
        # Surface the gate cleanly — no analysis, no hallucination
        msg = f"[SKIPPED — insufficient content]\n{e}"
        log(msg)
        return msg
    except Exception as e:
        gpt4o_result = f"GPT-4o error: {e}"

    print("\nGPT-4o OUTPUT:\n")
    print(gpt4o_result[:1500])

    # --- gemini fallback (text only) ---
    gemini_result = ""
    if "error" in gpt4o_result.lower() and not is_image:
        log("Switching to Gemini Pro fallback...")
        try:
            # Gemini also goes through the quality gate inside analyze_gemini
            check_text_quality(text, source="text (gemini fallback)")
            gemini_result = analyze_gemini(text, scene)
        except InsufficientContentError as e:
            gemini_result = f"[SKIPPED — insufficient content]\n{e}"
        except Exception as e:
            gemini_result = f"Gemini error: {e}"

    return (
        f"================ GPT-4o OUTPUT ================\n{gpt4o_result}\n\n"
        f"================ GEMINI OUTPUT ================\n"
        f"{gemini_result if gemini_result else 'Not used / not required'}\n"
        f"===============================================\n"
    )

# =========================================================
# SUPABASE SAVE
# =========================================================

def save_to_supabase(text: str, analysis: str, scene: str, file_path: str):
    try:
        response = supabase.table("documents").insert({
            "type_name":     "memory_pipeline",
            "content":       text[:10000],
            "mini_analysis": analysis,
            "question_set":  scene,
            "source_file":   os.path.basename(file_path),
        }).execute()
        log("Supabase insert successful")
        return response.data
    except Exception as e:
        log(f"Supabase error: {e}")
        return None

# =========================================================
# MAIN PIPELINE
# =========================================================

def run(file_path: str, scene: str = "scene_first"):
    log(f"Processing: {os.path.basename(file_path)}  |  scene: {scene}")

    ext      = file_path.rsplit(".", 1)[-1].lower()
    is_image = ext in ("jpg", "jpeg", "png", "webp")
    text     = ""
    source   = "text"   # used to pick the right word threshold

    try:
        # ---- extract content ----
        if ext in ("mp3", "wav", "m4a"):
            text   = transcribe_audio(file_path)
            source = "audio"

        elif ext == "pdf":
            text   = process_pdf(file_path)
            source = "pdf"

        elif ext == "docx":
            text   = process_docx(file_path)
            source = "docx"

        elif ext == "txt":
            text   = process_txt(file_path)
            source = "txt"

        elif is_image:
            text   = f"[IMAGE: {os.path.basename(file_path)}]"
            source = "image"

        elif ext in ("mp4", "mov"):
            text   = process_video(file_path)
            source = "audio"   # video → audio transcript

        else:
            raise ValueError(f"Unsupported file type: .{ext}")

        if not is_image and not text.strip():
            raise ValueError("No content extracted from file.")

        # ---- analyse (quality gate runs inside analyze()) ----
        result = analyze(file_path, scene, is_image, text, source=source)

        # ---- embed & index ----
        embed_src = result[:512] if is_image else text[:512]
        vec = np.array([embed_model.encode(embed_src)]).astype("float32")
        index.add(vec)

        # ---- persist ----
        save_to_supabase(text, result, scene, file_path)

        log(f"DONE: {os.path.basename(file_path)}")

    except Exception as e:
        log(f"PIPELINE ERROR: {e}")

# =========================================================
# COLAB RUNNER
# =========================================================

from google.colab import files

print("\nUPLOAD FILES\n")
uploaded = files.upload()

upload_dir = "/content/uploads"
os.makedirs(upload_dir, exist_ok=True)

confirmed_files = []
for filename in uploaded.keys():
    for candidate in (f"/content/{filename}", filename):
        if os.path.exists(candidate):
            dst = f"{upload_dir}/{filename}"
            shutil.move(candidate, dst)
            size = os.path.getsize(dst)
            print(f"✓ {filename} ({size:,} bytes)")
            confirmed_files.append(dst)
            break
    else:
        print(f"✗ Could not locate {filename} — skipping")

print(f"\n{len(confirmed_files)} file(s) ready\n")

SCENES = ["warm_to_deep", "scene_first", "relational_lens"]

for file_path in confirmed_files:
    for scene in SCENES:
        run(file_path, scene)
