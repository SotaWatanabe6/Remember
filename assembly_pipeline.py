# =========================================================
# INSTALL
# =========================================================
#!pip install pymupdf faiss-cpu assemblyai pytesseract python-docx supabase openai sentence-transformers moviepy pillow -q

#!apt-get -qq install tesseract-ocr ffmpeg

# =========================================================
# IMPORTS
# =========================================================
import os
import base64
import shutil
import logging
import sys # Import sys

# Add the path to the installed packages
sys.path.append('/usr/local/lib/python3.10/dist-packages') # Adjust path if necessary

import fitz # Moved import here
import faiss # Moved import here
import numpy as np # Moved import here
import assemblyai as aai # Moved import here

from PIL import Image # Moved import here
from docx import Document # Moved import here
from moviepy.editor import VideoFileClip # Moved import here
from sentence_transformers import SentenceTransformer # Moved import here
from supabase import create_client # Moved import here
from openai import OpenAI # Moved import here
import google.generativeai as genai # Moved import here
import pytesseract # Moved import here

logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
        "OPENAI_API_KEY":     OPENAI_API_KEY,
        "ASSEMBLYAI_API_KEY": ASSEMBLYAI_API_KEY,
    }.items()
    if not val
]
if missing:
    raise ValueError(f"Missing env vars: {', '.join(missing)}")

# =========================================================
# INIT CLIENTS
# =========================================================

supabase             = create_client(SUPABASE_URL, SUPABASE_KEY)
aai.settings.api_key = ASSEMBLYAI_API_KEY
openai_client        = OpenAI(api_key=OPENAI_API_KEY)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
index       = faiss.IndexFlatL2(384)

# =========================================================
# CONTENT THRESHOLDS
# =========================================================

MIN_WORDS_TEXT  = 30
MIN_WORDS_AUDIO = 20
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
    words = _word_count(text)
    if words < min_words:
        raise InsufficientContentError(
            f"{source} has only {words} words (minimum {min_words}). "
            "Skipping to prevent hallucination."
        )
    TRANSACTIONAL_SIGNALS = [
        "tracking number", "usps", "fedex", "ups", "order number",
        "shipping label", "return label", "fulfillment center",
        "invoice", "purchase order", "bill of lading",
    ]
    hits = sum(1 for s in TRANSACTIONAL_SIGNALS if s in text.lower())
    if hits >= 2:
        raise InsufficientContentError(
            f"{source} appears transactional ({hits} commercial signals). Skipping."
        )


def check_image_quality(path: str):
    size = os.path.getsize(path)
    if size < MIN_IMAGE_BYTES:
        raise InsufficientContentError(
            f"Image too small ({size:,} bytes). Likely icon or corrupt — skipping."
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
    config      = aai.TranscriptionConfig(punctuate=True, format_text=True)
    result      = transcriber.transcribe(path, config=config)
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
    temp_audio = "/tmp/pipeline_audio.wav"
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
# SYSTEM PROMPT — strict anti-hallucination
# =========================================================

SYSTEM_PROMPT = """\
You are a precise emotional intelligence system.

STRICT RULES — no exceptions:
1. Only report what is DIRECTLY OBSERVABLE in the content. No speculation.
2. If a field has no clear visual or textual evidence, respond with exactly: null
3. Never use hedging phrases like "could suggest", "might imply", or "possibly".
   If you are not certain from direct evidence, use null.
4. Every claim must be traceable to a specific visible element or exact quote.
5. Do not pad responses with filler. Concise and grounded only.
"""

# =========================================================
# PROMPTS — 3 fields only, no personality or meaning
# =========================================================

USER_PROMPT_IMAGE = """\
Analyse this image. For each field, respond only with what you can DIRECTLY observe.
Use null if there is no clear evidence — do not guess.

1. EMOTIONS      — emotions that are clearly visible (facial expressions, body language)
2. RELATIONSHIPS — only state what is physically demonstrated (touching, shared action,
                   matching clothing, name tags). Do NOT infer bonds from proximity alone.
3. NARRATIVE     — describe only what is factually happening in the scene

Do not invent or infer beyond what is visible.
"""

USER_PROMPT_TEXT = """\
Analyse the following content. For each field, respond only with what is DIRECTLY stated.
Use null if there is no evidence — do not guess.

1. EMOTIONS      — emotions explicitly expressed or clearly described
2. RELATIONSHIPS — relationships between people that are explicitly mentioned
3. NARRATIVE     — summarise only what is factually present in the content

Do not invent or infer beyond what is written.

CONTENT:
{content}
"""

# =========================================================
# ANALYSIS — single pass
# =========================================================

def analyze_image(file_path: str) -> str:
    check_image_quality(file_path)
    b64, media_type = encode_image_base64(file_path)

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
                    {"type": "text", "text": USER_PROMPT_IMAGE},
                ],
            },
        ],
        max_tokens=600,
    )
    return response.choices[0].message.content


def analyze_text(text: str, source: str = "text") -> str:
    min_w = MIN_WORDS_AUDIO if source == "audio" else MIN_WORDS_TEXT
    check_text_quality(text, source=source, min_words=min_w)

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": USER_PROMPT_TEXT.format(content=text[:8000])},
        ],
        max_tokens=600,
    )
    return response.choices[0].message.content

# =========================================================
# SUPABASE SAVE — correct fields matching your schema
# =========================================================

def save_to_supabase(text: str, analysis: str, file_path: str):
    try:
        response = supabase.table("documents").insert({
            "memorial_id":   '7638e909-d995-437c-b01e-b913854009a7', # Hardcoded memorial_id for testing
            "type_name":     "gpt4o_analysis",
            "content":       text[:10000],
            "mini_analysis": analysis,
            "file_url":      os.path.basename(file_path),
        }).execute()
        log("Supabase insert successful")
        return response.data
    except Exception as e:
        log(f"Supabase error: {e}")
        return None

# =========================================================
# MAIN PIPELINE — single pass
# =========================================================

def run(file_path: str):
    log(f"Processing: {os.path.basename(file_path)}")

    ext      = file_path.rsplit(".", 1)[-1].lower()
    is_image = ext in ("jpg", "jpeg", "png", "webp")
    text     = ""
    source   = "text"

    try:
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
            source = "audio"

        else:
            raise ValueError(f"Unsupported file type: .{ext}")

        if not is_image and not text.strip():
            raise ValueError("No content extracted from file.")

        # ---- single analysis pass ----
        try:
            if is_image:
                result = analyze_image(file_path)
            else:
                result = analyze_text(text, source=source)
        except InsufficientContentError as e:
            log(f"[SKIPPED — insufficient content]\n{e}")
            return

        print("\nOUTPUT:\n")
        print(result)

        # ---- embed & index ----
        embed_src = result[:512] if is_image else text[:512]
        vec = np.array([embed_model.encode(embed_src)]).astype("float32")
        index.add(vec)

        # ---- persist ----
        save_to_supabase(text, result, file_path)
        log(f"DONE: {os.path.basename(file_path)}")

    except Exception as e:
        log(f"PIPELINE ERROR: {e}")

# =========================================================
# COLAB RUNNER
# =========================================================

if __name__ == "__main__":
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

    for file_path in confirmed_files:
        run(file_path)






























