import os
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pypdf import PdfReader

from google import genai
from google.genai import types as genai_types
try:
    from backend import config
except ImportError:
    import config



# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("study-assistant")

app = FastAPI(title="Study Assistant API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
if config.GEMINI_API_KEY:
    _gemini_client = genai.Client(api_key=config.GEMINI_API_KEY)
else:
    _gemini_client = None
    logger.warning("GEMINI_API_KEY is not set in environment variables!")

GEMINI_MODEL = "gemini-3.5-flash"

# Models
class QuizRequest(BaseModel):
    topic: str
    num_questions: Optional[int] = 5

class ChatMessage(BaseModel):
    role: str  # "user" or "model" / "assistant"
    parts: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

@app.post("/api/quiz")
async def generate_quiz(req: QuizRequest):
    if not config.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")
    
    prompt = f"""
    You are an expert quiz generator. Generate a multiple-choice quiz about the topic: "{req.topic}".
    Create exactly {req.num_questions} questions.
    Each question must have exactly 4 choices and 1 correct answer.
    Return ONLY a raw JSON array matching this schema, without markdown formatting or code blocks:
    [
      {{
        "question": "The question text",
        "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
        "correct_answer": "The exact string of the correct choice from the choices array"
      }}
    ]
    """
    try:
        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        quiz_data = json.loads(response.text)
        return {"quiz": quiz_data}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response from Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate valid quiz format. Please try again.")
    except Exception as e:
        logger.error(f"Error in quiz generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    if not config.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # Extract text from PDF
        reader = PdfReader(file.file)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            # Limit total text size to avoid token limit errors for extremely long PDFs
            if len(text) > 100000:
                text = text[:100000] + "\n...[Text truncated for length]..."
                break
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in the PDF.")
            
        prompt = f"""
        You are a helpful study assistant. Summarize the following extracted PDF text. 
        Your summary should include:
        1. A high-level overview of the document.
        2. Key concepts or themes.
        3. Bullet points of main takeaways.
        
        Extracted Text:
        {text}
        """
        
        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return {"summary": response.text, "char_count": len(text)}
    except Exception as e:
        logger.error(f"Error in PDF summarization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not config.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")
    
    try:
        # Build conversation history in new SDK format
        contents = []
        for msg in req.history:
            role = "user" if msg.role == "user" else "model"
            contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=msg.parts)]))
        # Append the new user message
        contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=req.message)]))

        response = _gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents
        )
        return {"response": response.text}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve Frontend static files
# Resolve relative to this file so it works no matter how uvicorn is launched
_this_dir = os.path.dirname(os.path.abspath(__file__))   # .../study-assistant/backend
frontend_dir = os.path.join(_this_dir, "..", "frontend")  # .../study-assistant/frontend
frontend_dir = os.path.normpath(frontend_dir)

# Serve index.html at root
@app.get("/")
async def read_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": f"Frontend not found at {frontend_dir}. Make sure the frontend folder exists."}

# Mount static files AFTER the API routes so /api/* routes take priority
# Mount at root so that relative paths (style.css, main.js) in index.html resolve correctly
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
    logger.info(f"Serving frontend from: {frontend_dir}")
else:
    logger.warning(f"Frontend directory not found: {frontend_dir}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=config.HOST, port=config.PORT, reload=True)
