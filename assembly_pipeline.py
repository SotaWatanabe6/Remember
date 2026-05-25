# =========================================================
# ASSEMBLYAI + GPT-4o + SUPABASE + FAISS PIPELINE (CLEAN)
# =========================================================

import os
import fitz
import faiss
import numpy as np
import assemblyai as aai
import pytesseract

from dotenv import load_dotenv
from PIL import Image
from docx import Document
from moviepy.editor import VideoFileClip
from sentence_transformers import SentenceTransformer
from supabase import create_client
from openai import OpenAI

# =========================================================
# LOAD ENV VARIABLES (NO HARDCODED KEYS)
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# =========================================================
# INIT SERVICES
# =========================================================

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

aai.settings.api_key = ASSEMBLYAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
index = faiss.IndexFlatL2(384)

# =========================================================
# SCENES
# =========================================================

SCENES = {
    "warm_to_deep": "FIRST MEMORY... emotional depth analysis",
    "scene_first": "ORDINARY DAY... narrative reconstruction",
    "relational_lens": "RELATIONSHIPS... emotional mapping"
}

# =========================================================
# LOGS
# =========================================================

def log_processing(f):
    print(f"\nProcessing: {f}\n")

def log_preview(t):
    print("\nTEXT PREVIEW:\n", t[:500], "\n")

def log_ai_start():
    print("\nRunning GPT-4o analysis...\n")

def log_ai_output(x):
    print("\nAI OUTPUT:\n", str(x)[:1000], "\n")

def log_error(e):
    print("❌ Error:", e)

def log_done(f):
    print(f"\n✅ DONE: {f}\n")

# =========================================================
# ASSEMBLYAI TRANSCRIPTION
# =========================================================

def transcribe_audio(path):

    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro"],
        punctuate=True,
        format_text=True
    )

    transcriber = aai.Transcriber(config=config)

    try:
        result = transcriber.transcribe(path)
        return result.text
    except Exception as e:
        return f"AssemblyAI error: {e}"

# =========================================================
# FILE PROCESSORS
# =========================================================

def process_pdf(path):
    pdf = fitz.open(path)
    return "\n".join(page.get_text() for page in pdf)

def process_docx(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)

def process_txt(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def process_image(path):
    return pytesseract.image_to_string(Image.open(path))

def process_video(path):
    temp_audio = "temp.wav"
    clip = VideoFileClip(path)
    clip.audio.write_audiofile(temp_audio)
    return transcribe_audio(temp_audio)

# =========================================================
# GPT-4o ANALYSIS
# =========================================================

def analyze(text, scene):

    prompt = f"""
You are an emotional memory intelligence AI.

Scene:
{SCENES.get(scene, "")}

Analyze:
- emotions
- relationships
- personality
- hidden meaning
- narrative structure
- memory significance

CONTENT:
{text[:8000]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You extract deep emotional meaning."},
                {"role": "user", "content": prompt}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"OpenAI error: {e}"

# =========================================================
# SUPABASE SAVE
# =========================================================

def save_to_supabase(text, analysis, scene):

    try:
        supabase.table("documents").insert({
            "type_name": "assemblyai_pipeline",
            "content": text,
            "mini_analysis": analysis,
            "question_set": scene
        }).execute()

    except Exception as e:
        log_error(e)

# =========================================================
# MAIN PIPELINE
# =========================================================

def run(file_path, scene="scene_first"):

    log_processing(file_path)

    ext = file_path.split(".")[-1].lower()

    if ext in ["mp3", "wav", "m4a"]:
        text = transcribe_audio(file_path)

    elif ext == "pdf":
        text = process_pdf(file_path)

    elif ext == "docx":
        text = process_docx(file_path)

    elif ext == "txt":
        text = process_txt(file_path)

    elif ext in ["jpg", "jpeg", "png"]:
        text = process_image(file_path)

    elif ext in ["mp4", "mov"]:
        text = process_video(file_path)

    else:
        text = "unsupported file type"

    log_preview(text)

    log_ai_start()
    result = analyze(text, scene)
    log_ai_output(result)

    try:
        vec = np.array([embed_model.encode(text)]).astype("float32")
        index.add(vec)
    except Exception as e:
        log_error(e)

    save_to_supabase(text, result, scene)

    log_done(file_path)
