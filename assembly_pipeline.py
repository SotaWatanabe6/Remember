# =========================================================
# INSTALL
# =========================================================

!pip -q install assemblyai sentence-transformers faiss-cpu \
pymupdf moviepy pytesseract pillow opencv-python supabase \
openai python-docx textract google-generativeai

!apt-get -qq install tesseract-ocr ffmpeg


# =========================================================
# IMPORTS
# =========================================================

import fitz
import faiss
import numpy as np
import assemblyai as aai
import pytesseract

from PIL import Image
from docx import Document
from moviepy.editor import VideoFileClip
from sentence_transformers import SentenceTransformer
from supabase import create_client
from google.colab import files
from openai import OpenAI
import google.generativeai as genai


# =========================================================
# CONFIG
# =========================================================

SUPABASE_URL = "https://tbpdhybqbjucoxdizlgw.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_KEY"
ASSEMBLYAI_API_KEY = "YOUR_ASSEMBLYAI_KEY"
OPENAI_API_KEY = "YOUR_OPENAI_KEY"
GEMINI_API_KEY = "YOUR_GEMINI_KEY"


# =========================================================
# INIT
# =========================================================

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

aai.settings.api_key = ASSEMBLYAI_API_KEY
client = OpenAI(api_key=OPENAI_API_KEY)

genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
index = faiss.IndexFlatL2(384)


# =========================================================
# SCENES
# =========================================================

SCENES = {
    "warm_to_deep": "FIRST MEMORY emotional depth analysis",
    "scene_first": "ORDINARY DAY narrative reconstruction",
    "relational_lens": "RELATIONSHIPS emotional mapping"
}


# =========================================================
# LOGS (ONLY GPT OUTPUT)
# =========================================================

def log_processing(f):
    print(f"\nProcessing: {f}\n")

def log_ai_start():
    print("\nRunning GPT-4o analysis...\n")

def log_ai_output(x):
    print("\nGPT-4o OUTPUT:\n", str(x)[:1200], "\n")

def log_done(f):
    print(f"\nDONE: {f}\n")


# =========================================================
# TRANSCRIPTION (FIXED)
# =========================================================

def transcribe_audio(path):

    aai.settings.api_key = ASSEMBLYAI_API_KEY

    transcriber = aai.Transcriber()

    try:
        config = aai.TranscriptionConfig(
            speech_models=["universal-3-pro"],
            punctuate=True,
            format_text=True
        )

        result = transcriber.transcribe(path, config=config)

        return result.text if result.text else None

    except Exception:
        return None


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
    return open(path, encoding="utf-8").read()

def process_image(path):
    return pytesseract.image_to_string(Image.open(path))

def process_video(path):
    temp_audio = "temp.wav"
    clip = VideoFileClip(path)

    if clip.audio is None:
        return None

    clip.audio.write_audiofile(temp_audio)
    return transcribe_audio(temp_audio)


# =========================================================
# GPT-4o ANALYSIS 
# =========================================================

def analyze_gpt4o(text, scene):

    prompt = f"""
Scene:
{SCENES.get(scene,"")}

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
                {"role": "system", "content": "You are a deep emotional memory system."},
                {"role": "user", "content": prompt}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"GPT-4o error: {e}"


# =========================================================
# GEMINI 
# =========================================================

def analyze_gemini_hidden(text, scene):
    try:
        prompt = f"{SCENES.get(scene,'')}\n{text[:8000]}"
        gemini_model.generate_content(prompt)
    except:
        pass


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
    except:
        pass


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
        text = None

    # ❌ NO TEXT PREVIEW PRINTED

    if not text:
        print("⚠️ No valid content extracted, skipping GPT-4o")
        return

    log_ai_start()
    result = analyze_gpt4o(text, scene)
    log_ai_output(result)

    analyze_gemini_hidden(text, scene)

    try:
        vec = np.array([embed_model.encode(text)]).astype("float32")
        index.add(vec)
    except:
        pass

    save_to_supabase(text, result, scene)

    log_done(file_path)


# =========================================================
# UPLOAD
# =========================================================

print("\nUPLOAD FILES\n")
uploaded = files.upload()

print("\nSELECT SCENE\n")
print("1 → Warm to Deep")
print("2 → Scene First")
print("3 → Relational Lens")

choice = input("Enter choice: ")

scene_map = {
    "1": "warm_to_deep",
    "2": "scene_first",
    "3": "relational_lens"
}

ACTIVE_SCENE = scene_map.get(choice, "scene_first")

print("\nSelected:", ACTIVE_SCENE)

for f in uploaded.keys():
    run(f, ACTIVE_SCENE)
