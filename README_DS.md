# 🧠 Remembrance — AI Memory Intelligence System

A modular AI pipeline that extracts, analyzes, and stores “memory-like” insights from multimodal data (audio, video, documents, images).
It supports **A/B testing between Whisper and AssemblyAI** for transcription benchmarking.

---

## 🚀 Key Features

* 🎙️ Dual transcription system (Whisper vs AssemblyAI)
* ⚖️ A/B testing router for model comparison
* 🧠 GPT-4o emotional & semantic analysis
* 📊 FAISS vector embeddings for semantic memory retrieval
* 🗄️ Supabase storage for structured persistence
* 🖼️ OCR support for images (Tesseract)
* 🎥 Video → audio → transcription pipeline
* 📄 PDF, DOCX, TXT ingestion support
* 🔐 Secure API key management using `.env`

---

## 🏗️ System Architecture

```
Input File (audio/video/doc/image)
        ↓
Preprocessing Layer
        ↓
A/B Transcription Layer
   ├── Whisper
   └── AssemblyAI
        ↓
Text Output
        ↓
GPT-4o Analysis Engine
        ↓
Embedding (FAISS)
        ↓
Supabase Storage
```

---

## ⚖️ A/B Testing System

This project compares two transcription models:

| Model      | Type     | Strength                     |
| ---------- | -------- | ---------------------------- |
| Whisper    | Local ML | Fast, offline, lightweight   |
| AssemblyAI | API      | High accuracy, cloud-powered |

### How A/B works:

* Random or controlled routing between models
* Outputs stored with metadata
* Enables performance comparison over time

---

## 📦 Installation

```bash
git clone https://github.com/NATASHASAINI/Remembrance.git
cd Remembrance

pip install -r requirements.txt
```

---

## 🔐 Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
```

---

## ▶️ Usage

### Run pipelines:

```python
from pipeline_ab_test import transcribe

model, text = transcribe("sample.mp3")

print(model)
print(text)
```

---

## 📁 Project Structure

```
Remembrance/
│
├── whisper_pipeline.py
├── assembly_pipeline.py
├── pipeline_ab_test.py
│
├── .env
├── .gitignore
├── README_DS.md
```

---

## 📊 Output Stored In Supabase

Each run stores:

* Transcribed text
* Model used (Whisper / AssemblyAI)
* GPT-4o analysis
* Scene type
* Embeddings (FAISS-ready)

---

## 🧠 Use Cases

* AI memory assistants
* Meeting transcription intelligence
* Research audio analysis
* Multimodal AI pipelines
* Model benchmarking (A/B testing)

---

## 🔮 Future Improvements

* Latency tracking dashboard
* Accuracy scoring system
* Auto model selection (smart routing)
* Real-time streaming transcription
* Web UI for memory exploration

---

## 👩‍💻 Author

Natasha Saini
AI / ML Engineer | Data Systems | Applied AI Pipelines
