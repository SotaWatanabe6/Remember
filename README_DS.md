

<body>

  <h1>🧠 Remembrance</h1>
  <p><b>AI Memory Intelligence System</b></p>

  <div class="box">
    A modular AI pipeline that extracts, analyzes, and stores memory-like insights from multimodal data (audio, video, documents, images).<br/>
    Powered by <b>AssemblyAI (transcription)</b> + <b>Gemini (intelligence layer)</b> + FAISS + Supabase.
  </div>

  <h2>🚀 Key Features</h2>
  <ul>
    <li>🎙️ AssemblyAI-powered transcription system</li>
    <li>🧠 Gemini-powered semantic & emotional analysis</li>
    <li>📊 FAISS vector embeddings for memory retrieval</li>
    <li>🗄️ Supabase storage for persistence</li>
    <li>🖼️ OCR support for images (Tesseract)</li>
    <li>🎥 Video → audio → transcription pipeline</li>
    <li>📄 PDF, DOCX, TXT ingestion support</li>
    <li>⚡ Modular AI pipeline architecture</li>
  </ul>

  <h2>🏗️ System Architecture</h2>
  <pre>
Input File (audio / video / document / image)
        ↓
Preprocessing Layer
        ↓
AssemblyAI Transcription Layer
        ↓
Text Output
        ↓
Gemini Intelligence Engine
        ↓
Embedding Generation (FAISS)
        ↓
Supabase Storage
  </pre>

  <h2>⚖️ Transcription System</h2>

  <table>
    <tr>
      <th>Model</th>
      <th>Type</th>
      <th>Strength</th>
    </tr>
    <tr>
      <td>AssemblyAI</td>
      <td>API</td>
      <td>High accuracy, scalable cloud transcription</td>
    </tr>
  </table>

  <h2>🧠 Gemini Intelligence Layer</h2>
  <ul>
    <li>🧾 Summarization of transcripts</li>
    <li>😊 Emotion detection</li>
    <li>🧠 Insight extraction</li>
    <li>🏷️ Memory tagging</li>
    <li>📌 Structured context generation</li>
  </ul>

  <h2>📦 Installation</h2>

  <pre>
git clone https://github.com/NATASHASAINI/Remembrance.git
cd Remembrance

pip install -r requirements.txt
  </pre>

  <h2>🔐 Environment Variables</h2>

  <pre>
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
GEMINI_API_KEY=your_gemini_api_key
  </pre>

  <h2>▶️ Usage</h2>

  <pre>
from pipeline_ab_test import transcribe

model, text = transcribe("sample.mp3")

print(model)
print(text)
  </pre>

  <p><b>Output:</b> assemblyai</p>

  <pre>
from gemini_analysis import analyze_with_gemini

analysis = analyze_with_gemini(text)
print(analysis)
  </pre>

  <h2>📁 Project Structure</h2>

  <pre>
Remembrance/
│
├── assembly_pipeline.py
├── gemini_analysis.py
├── pipeline_ab_test.py
│
├── .env
├── .gitignore
├── README.html
  </pre>

  <h2>📊 Output Storage</h2>
  <ul>
    <li>Transcribed text (AssemblyAI)</li>
    <li>Gemini analysis (summary, emotions, insights)</li>
    <li>Scene classification</li>
    <li>Memory tags</li>
    <li>FAISS embeddings</li>
  </ul>

  <h2>🧠 Use Cases</h2>
  <ul>
    <li>AI memory assistants</li>
    <li>Meeting transcription intelligence</li>
    <li>Multimodal AI pipelines</li>
    <li>Long-term memory systems</li>
    <li>Personal AI knowledge systems</li>
  </ul>

  <h2>🔮 Future Improvements</h2>
  <ul>
    <li>Real-time streaming transcription</li>
    <li>Graph-based memory system</li>
    <li>Smart routing memory engine</li>
    <li>Latency dashboard</li>
    <li>Web UI memory explorer</li>
  </ul>

  <footer>
    <p>👩‍💻 Built by <b>Natasha Saini</b> | AI / ML Engineer | Data Systems</p>
  </footer>

</body>
</html>
