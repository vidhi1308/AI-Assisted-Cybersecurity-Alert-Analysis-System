# 🛡️ AI-Powered SOC Automation & MITRE Coverage Platform

## 📌 Overview

This project is an **AI-powered Security Operations Center (SOC) automation platform** designed to simulate real-world incident response workflows.

It enables users to:
- Generate realistic security alerts from detection rules
- Automatically create structured remediation playbooks using LLMs
- Reduce hallucinations using Retrieval-Augmented Generation (RAG)
- Map alerts to MITRE ATT&CK techniques
- Visualize coverage via a heatmap-style dashboard

The system demonstrates **evidence-based alert coverage**, where only alerts with generated playbooks contribute to MITRE coverage.

---

## 🎯 Project Goals

- Simulate SOC workflows end-to-end:

Detection → Alert → Playbook → MITRE Coverage → Dashboard

- Use AI responsibly with minimal hallucination
- Provide structured, actionable playbooks
- Demonstrate MITRE ATT&CK coverage based on actual remediation capability

---

## 🏗️ Architecture

### Backend (FastAPI)
- Alert generation from detection YAMLs
- Alert normalization and persistence
- Playbook generation using LLM (Ollama)
- RAG-based contextual grounding
- MITRE coverage computation

### AI Layer
- Local LLM via **Ollama**
- Model: `llama3.1:8b` (default)
- Strict JSON schema enforcement
- Prompt engineering + post-processing for accuracy

### RAG (Retrieval-Augmented Generation)
- Custom cybersecurity knowledge base (`kb/`)
- Embeddings via `sentence-transformers`
- Local vector search
- Context injection into prompts

### Database
- SQLite (local)
- Stores:
- Alerts
- Playbooks
- Raw alert context

### MITRE ATT&CK Integration
- Local ATT&CK Enterprise dataset (STIX)
- Techniques + tactics mapping
- Coverage based **only on alerts with playbooks**

### Frontend
- Fully functional UI (built separately)
- Displays:
- Alerts
- Playbooks
- MITRE heatmap

---

## 🗂️ Project Structure


FINAL PROJECT/
│
├── kb/ # Knowledge base (RAG input)
│ ├── *.md
│
├── src/
│ ├── alert_generator.py
│ └── backend/
│ ├── alert_service.py
│ ├── detection_loader.py
│ └── app/
│ ├── main.py
│ ├── db/
│ │ ├── models.py
│ │ └── database.py
│ ├── schemas/
│ │ ├── alert.py
│ │ └── playbook.py
│ ├── rag/
│ │ ├── kb_indexer.py
│ │ ├── retriever.py
│ │ └── kb_index.json
│ ├── mitre/
│ │ ├── build_mitre_index.py
│ │ └── loader.py
│ ├── mitre_data/
│ │ ├── enterprise-attack.json
│ │ └── mitre_index.json
│ └── llm/
│ └── ollama_client.py
│
└── README.md


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd FINAL-PROJECT
2️⃣ Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
3️⃣ Install dependencies
pip install -r requirements.txt

(If requirements.txt is not present, install manually:)

pip install fastapi uvicorn sqlalchemy pydantic requests sentence-transformers numpy tqdm python-dateutil
4️⃣ Install Ollama (LLM)

Download:
👉 https://ollama.com/download

Verify:

ollama --version

Pull model:

ollama pull llama3.1:8b

Warm up model:

ollama run llama3.1:8b "Respond with OK"
5️⃣ Build Knowledge Base Index (RAG)
python src/backend/app/rag/kb_indexer.py
6️⃣ Build MITRE Index
python src/backend/app/mitre/build_mitre_index.py
7️⃣ Run the backend
uvicorn src.backend.app.main:app --reload

Open:
👉 http://127.0.0.1:8000/docs

🚀 Usage
Generate and save alert
POST /detections/{detection_id}/generate-and-save
View alerts
GET /alerts
Generate playbook
POST /alerts/{alert_id}/generate-playbook
View playbooks
GET /playbooks
GET /alerts/{alert_id}/playbook
MITRE Coverage
GET /mitre/coverage
GET /mitre/heatmap
