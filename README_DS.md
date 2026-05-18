<div align="center">

<h1>🧠 Multimodal AI Semantic Pipeline</h1>

<h3>Supabase + Gemini + Whisper + FAISS + Memory Intelligence</h3>

<p>
An AI-powered multimodal storytelling and semantic memory pipeline that processes PDFs, text, audio, video, and images to generate emotional intelligence, narrative synthesis, vector embeddings, and memory relationship analysis.
</p>

<img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Gemini-AI-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge" />
<img src="https://img.shields.io/badge/FAISS-VectorDB-red?style=for-the-badge" />
<img src="https://img.shields.io/badge/OpenAI-Whisper-black?style=for-the-badge" />

</div>

---

# ✨ Features

<ul>
<li>📄 Upload and process PDFs</li>
<li>📝 Process TXT documents</li>
<li>🎙️ Whisper audio transcription</li>
<li>🎥 Video-to-text extraction</li>
<li>🖼️ OCR image text extraction</li>
<li>🧠 Gemini emotional narrative analysis</li>
<li>💭 Human-centered memory intelligence</li>
<li>🔍 Semantic similarity search using FAISS</li>
<li>🧬 Memory constellation analysis</li>
<li>👥 Contributor relationship storytelling</li>
<li>📦 Supabase cloud storage integration</li>
<li>📊 Vector embedding generation</li>
<li>🧩 Narrative synthesis and emotional mapping</li>
</ul>

---

# 🏗️ Architecture

```text
                ┌─────────────────┐
                │  User Uploads   │
                │ PDF / Audio etc │
                └────────┬────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Content Extractor │
              │ OCR / Whisper     │
              └────────┬─────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Gemini AI Analysis  │
            │ Emotional Synthesis │
            └────────┬────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│ FAISS Vector DB │   │ Supabase Cloud  │
│ Semantic Search │   │ Metadata Store  │
└─────────────────┘   └─────────────────┘
```

---

# 🚀 Supported File Types

<table>
<tr>
<th>Type</th>
<th>Formats</th>
</tr>

<tr>
<td>Documents</td>
<td>PDF, TXT</td>
</tr>

<tr>
<td>Audio</td>
<td>MP3, WAV, M4A</td>
</tr>

<tr>
<td>Video</td>
<td>MP4, MOV, AVI</td>
</tr>

<tr>
<td>Images</td>
<td>JPG, JPEG, PNG</td>
</tr>

</table>

---

# 🧠 AI Capabilities

<h3>Gemini Narrative Intelligence</h3>

<ul>
<li>Emotional pattern analysis</li>
<li>Relationship constellation mapping</li>
<li>Memory synthesis</li>
<li>Human-centered storytelling</li>
<li>Voice and phrase recognition</li>
<li>Community and legacy insights</li>
<li>Semantic emotional clustering</li>
<li>Narrative arc generation</li>
</ul>

---

# 📚 Memory Question Sets

<h2>1️⃣ Warm to Deep</h2>

<p>
Begins with simple memories and gradually moves into emotional depth, hardship, identity, and legacy.
</p>

<h2>2️⃣ Scene First</h2>

<p>
Scene-driven storytelling optimized for rich sensory extraction and narrative detail.
</p>

<h2>3️⃣ Relational Lens</h2>

<p>
Focuses on relationships, emotional impact, and interpersonal dynamics.
</p>

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/multimodal-ai-semantic-pipeline.git

cd multimodal-ai-semantic-pipeline
```

---

## Install Dependencies

```bash
pip install boto3 sentence-transformers faiss-cpu pymupdf \
moviepy openai-whisper torch python-multipart \
pytesseract pillow opencv-python \
supabase google-generativeai
```

---

## Install OCR Engine

```bash
apt-get install tesseract-ocr
```

---

# 🔑 Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

# 🗂️ Supabase Setup

<h3>Create Storage Bucket</h3>

```text
Bucket Name:
multimodal-files
```

✅ Enable Public Bucket

---

# ▶️ Run the Pipeline

```bash
python app.py
```

---

# 🔍 Semantic Search Example

```python
query = "childhood memories and emotional resilience"

results = semantic_search(query)

for result in results:
    print(result)
```

---

# 🧬 Example AI Output

```text
Emotional Summary:
The contributor describes a deeply nurturing relationship
defined by warmth, resilience, and quiet emotional support.

Relationship Constellation:
The subject acted as an emotional anchor within the family,
particularly during periods of hardship.

Narrative Arc:
The memories evolve from ordinary domestic scenes into
a broader reflection on identity, grief, and legacy.
```

---

# 🛠️ Core Technologies

<table>
<tr>
<th>Technology</th>
<th>Purpose</th>
</tr>

<tr>
<td>Gemini 2.5 Flash</td>
<td>Narrative intelligence & emotional analysis</td>
</tr>

<tr>
<td>Whisper</td>
<td>Speech-to-text transcription</td>
</tr>

<tr>
<td>FAISS</td>
<td>Vector similarity search</td>
</tr>

<tr>
<td>Supabase</td>
<td>Storage + database backend</td>
</tr>

<tr>
<td>Sentence Transformers</td>
<td>Embedding generation</td>
</tr>

<tr>
<td>Tesseract OCR</td>
<td>Image text extraction</td>
</tr>

</table>

---

# 📂 Project Structure

```text
multimodal-ai-semantic-pipeline/
│
├── app.py
├── requirements.txt
├── README.md
├── assets/
├── uploads/
├── vector_store/
└── notebooks/
```

---

# 🌟 Future Improvements

<ul>
<li>Real-time streaming transcription</li>
<li>Graph database integration</li>
<li>Memory relationship visualization</li>
<li>Contributor network analytics</li>
<li>Emotion timeline tracking</li>
<li>LangChain agent integration</li>
<li>Docker & Kubernetes deployment</li>
<li>FastAPI backend APIs</li>
</ul>

---

# 🐳 Docker Support

```bash
docker build -t multimodal-ai-pipeline .

docker run -p 8000:8000 multimodal-ai-pipeline
```

---

# ☁️ Deployment Ideas

<ul>
<li>AWS EC2</li>
<li>Google Cloud Run</li>
<li>Render</li>
<li>Railway</li>
<li>Azure Container Apps</li>
<li>Kubernetes Clusters</li>
</ul>

---

# ❤️ Vision

<p>
This project is designed to preserve human stories, relationships,
voices, emotions, and memories through AI-powered semantic understanding.

Rather than simply storing files, the system attempts to understand
people, emotional patterns, identity, and interpersonal meaning.
</p>

---

---

# 📜 License

```text
MIT License
```

---

<div align="center">


</div>
