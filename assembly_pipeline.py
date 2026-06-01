# =========================================================
# LIGHTWEIGHT IMPORTS ONLY (SAFE FOR UVICORN)
# =========================================================

import os
import numpy as np

from supabase import create_client
from openai import OpenAI
import assemblyai as aai
import google.generativeai as genai


# =========================================================
# GLOBAL LAZY STATE
# =========================================================

index = None
embed_model = None


# =========================================================
# CONFIG
# =========================================================

SUPABASE_URL = "https://tbpdhybqbjucoxdizlgw.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_KEY")

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "YOUR_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_KEY")


# =========================================================
# CLIENT INIT (SAFE)
# =========================================================

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

aai.settings.api_key = ASSEMBLYAI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")


# =========================================================
# SCENES
# =========================================================

SCENES = {
    "warm_to_deep": "FIRST MEMORY emotional depth analysis",
    "scene_first": "ORDINARY DAY narrative reconstruction",
    "relational_lens": "RELATIONSHIPS emotional mapping"
}


# =========================================================
# LAZY MODEL INIT (FAISS + SENTENCE TRANSFORMERS)
# =========================================================

def init_models():
    global faiss, SentenceTransformer, index, embed_model

    import faiss
    from sentence_transformers import SentenceTransformer

    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    index = faiss.IndexFlatL2(384)


# =========================================================
# FILE PROCESSORS (ALL LAZY IMPORTS FIXED)
# =========================================================

def process_pdf(path):
    import fitz
    pdf = fitz.open(path)
    return "\n".join(page.get_text() for page in pdf)


def process_docx(path):
    from docx import Document
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)


def process_txt(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def process_image(path):
    import pytesseract
    from PIL import Image
    return pytesseract.image_to_string(Image.open(path))


def process_video(path):
    # FIX: moviepy is ONLY imported here (no more crash at startup)
    from moviepy.editor import VideoFileClip

    temp_audio = "temp.wav"
    clip = VideoFileClip(path)

    if clip.audio is None:
        return None

    clip.audio.write_audiofile(temp_audio)
    return transcribe_audio(temp_audio)


# =========================================================
# TRANSCRIPTION (ASSEMBLYAI)
# =========================================================

def transcribe_audio(path):
    transcriber = aai.Transcriber()

    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro"],
        punctuate=True,
        format_text=True
    )

    result = transcriber.transcribe(path, config=config)
    return result.text if result.text else None


# =========================================================
# GPT ANALYSIS
# =========================================================

def analyze_gpt4o(text, scene):

    scene_prompt = SCENES.get(scene, "General analysis")

    prompt = f"""
Scene:
{scene_prompt}

Analyze:
- emotions
- relationships
- personality
- narrative structure
- meaning

CONTENT:
{text[:8000]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a memory intelligence system."},
                {"role": "user", "content": prompt}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"GPT-4o error: {e}"


# =========================================================
# EMBEDDINGS + FAISS (SAFE)
# =========================================================

def add_to_vector_db(text):

    global index, embed_model

    try:
        if embed_model is None or index is None:
            init_models()

        embedding = embed_model.encode(text)
        vec = np.array(embedding, dtype="float32").reshape(1, -1)

        index.add(vec)

    except Exception as e:
        print("Vector error:", e)


# =========================================================
# SUPABASE SAVE
# =========================================================

def save_to_supabase(text, analysis, scene):

    try:
        supabase.table("documents").insert({
            "type_name": "memory_pipeline",
            "content": text,
            "mini_analysis": analysis,
            "question_set": scene
        }).execute()

    except Exception as e:
        print("Supabase error:", e)


# =========================================================
# ROUTER (NO IMPORT CRASH POINTS)
# =========================================================

def extract_text(file_path):

    ext = file_path.split(".")[-1].lower()

    if ext in ["mp3", "wav", "m4a"]:
        return transcribe_audio(file_path)

    if ext == "pdf":
        return process_pdf(file_path)

    if ext == "docx":
        return process_docx(file_path)

    if ext == "txt":
        return process_txt(file_path)

    if ext in ["jpg", "jpeg", "png"]:
        return process_image(file_path)

    if ext in ["mp4", "mov"]:
        return process_video(file_path)

    return None


# =========================================================
# MAIN PIPELINE
# =========================================================

def run(file_path, scene="scene_first"):

    try:
        text = extract_text(file_path)

        if not text:
            return {"error": "No content extracted"}

        result = analyze_gpt4o(text, scene)

        add_to_vector_db(text)
        save_to_supabase(text, result, scene)

        return {
            "status": "success",
            "scene": scene,
            "analysis": result
        }

    except Exception as e:
        return {"error": str(e)}
