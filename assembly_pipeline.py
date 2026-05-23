# =========================================================
# IMPORTS(GPT4O+GEMINI+SUPABASE+FAISS+ASSEMBLYAI)
# =========================================================
import os
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
# VALIDATION 
# =========================================================
if not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY")
if not ASSEMBLYAI_API_KEY:
    raise ValueError("Missing ASSEMBLYAI_API_KEY")


# =========================================================
# INIT CLIENTS
# =========================================================

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

aai.settings.api_key = ASSEMBLYAI_API_KEY

openai_client = OpenAI(api_key=OPENAI_API_KEY)

genai.configure(api_key=GEMINI_API_KEY)

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
# LOGGING
# =========================================================

def log(msg):
    print(f"\n{msg}\n")


# =========================================================
# TRANSCRIPTION
# =========================================================

def transcribe_audio(path):
    try:
        transcriber = aai.Transcriber()

        config = aai.TranscriptionConfig(
            speech_models=["universal-3-pro"],
            punctuate=True,
            format_text=True
        )

        result = transcriber.transcribe(path, config=config)

        if not result.text:
            raise ValueError("Empty transcription")

        return result.text

    except Exception as e:
        raise RuntimeError(f"AssemblyAI error: {e}")


# =========================================================
# FILE PROCESSORS
# =========================================================

def process_pdf(path):
    doc = fitz.open(path)
    return "\n".join(page.get_text() for page in doc)

def process_docx(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)

def process_txt(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def process_image(path):
    return pytesseract.image_to_string(Image.open(path))

def process_video(path):
    clip = VideoFileClip(path)

    if clip.audio is None:
        raise ValueError("Video has no audio")

    temp_audio = "temp.wav"
    clip.audio.write_audiofile(temp_audio)

    return transcribe_audio(temp_audio)


# =========================================================
# GPT-4o ANALYSIS (PRIMARY)
# =========================================================

def analyze_gpt4o(text, scene):
    prompt = f"""
Scene:
{SCENES.get(scene, "")}

Analyze deeply:
- emotions
- relationships
- personality
- narrative structure
- meaning

CONTENT:
{text[:8000]}
"""

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a deep emotional intelligence system."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content


# =========================================================
# GEMINI ANALYSIS 
# =========================================================

def analyze_gemini(text, scene):
    prompt = f"""
Scene:
{SCENES.get(scene, "")}

Analyze:
- emotions
- relationships
- personality
- narrative structure
- meaning

CONTENT:
{text[:8000]}
"""

    model = genai.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)

    if not response or not response.text:
        raise ValueError("Empty Gemini response")

    return response.text


# =========================================================
# ANALYSIS ROUTER (GPT-4o ALWAYS INCLUDED IN OUTPUT)
# =========================================================

def analyze(text, scene):

    log("Running GPT-4o analysis...")

    try:
        gpt4o_result = analyze_gpt4o(text, scene)
    except Exception as e:
        gpt4o_result = f"GPT-4o error: {e}"

    print("\nGPT-4o OUTPUT:\n")
    print(gpt4o_result[:1500])

    gemini_result = ""

    # fallback only if needed
    if "error" in gpt4o_result.lower():
        log("Switching to Gemini Pro...")
        try:
            gemini_result = analyze_gemini(text, scene)
        except Exception as e:
            gemini_result = f"Gemini error: {e}"

    final_output = f"""
================ GPT-4o OUTPUT ================
{gpt4o_result}

================ GEMINI OUTPUT ================
{gemini_result if gemini_result else "Not used / not required"}

===============================================
"""

    return final_output


# =========================================================
# SUPABASE SAVE
# =========================================================

def save_to_supabase(text, analysis, scene):
    try:
        response = supabase.table("documents").insert({
            "type_name": "memory_pipeline",
            "content": text,
            "mini_analysis": analysis,
            "question_set": scene
        }).execute()

        log("Supabase insert successful")
        return response.data

    except Exception as e:
        log(f"Supabase error: {e}")
        return None


# =========================================================
# MAIN PIPELINE
# =========================================================

def run(file_path, scene="scene_first"):

    log(f"Processing: {file_path}")

    ext = file_path.split(".")[-1].lower()

    try:
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
            raise ValueError("Unsupported file type")

        if not text:
            raise ValueError("No extracted text")

        result = analyze(text, scene)

        vec = np.array([embed_model.encode(text)]).astype("float32")
        index.add(vec)

        save_to_supabase(text, result, scene)

        log(f"DONE: {file_path}")

    except Exception as e:
        log(f"PIPELINE ERROR: {e}")


# =========================================================
# COLAB RUNNER
# =========================================================

from google.colab import files

print("\nUPLOAD FILES\n")
uploaded = files.upload()

print("\nSelect Scene:\n1 warm_to_deep\n2 scene_first\n3 relational_lens")

choice = input("Enter choice: ")

scene_map = {
    "1": "warm_to_deep",
    "2": "scene_first",
    "3": "relational_lens"
}

ACTIVE_SCENE = scene_map.get(choice, "scene_first")

log(f"Selected: {ACTIVE_SCENE}")

for f in uploaded.keys():
    run(f, ACTIVE_SCENE)
