"""
MinuteTalk AI - FastAPI Backend

This module provides the REST API endpoints for the MinuteTalk AI application.
It uses Groq for AI-powered topic and hint generation, wrapped in the Mangum
ASGI adapter for AWS Lambda compatibility.

Architecture:
- FastAPI: Modern Python web framework for building APIs
- Mangum: ASGI adapter for AWS Lambda
- Groq: External LLM API for generating topics and hints

Endpoints:
- POST /api/topic: Generate a random speaking topic
- GET /api/health: Health check endpoint
"""

import os
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from mangum import Mangum
from groq import Groq
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MinuteTalk AI API",
    description="Backend API for generating impromptu speaking topics and hints",
    version="1.0.0",
)

# Configure CORS - allow all origins for demo purposes.
# NOTE: allow_credentials is left as False because it is incompatible with
# allow_origins=["*"] (browsers reject `Access-Control-Allow-Origin: *` when
# credentials are enabled). This app does not use cookies or auth tokens.
# In production, restrict allow_origins to your frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== DATA MODELS ====================

class TopicRequest(BaseModel):
    """Request model for generating a topic"""
    category: str = Field(..., description="The category ID for topic generation")


class TopicResponse(BaseModel):
    """Response model for topic generation"""
    topic: str = Field(..., description="The generated speaking topic")
    hints: List[str] = Field(default_factory=list, description="Optional talking points")
    category: str = Field(..., description="The category used")


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    message: str


class ExplainRequest(BaseModel):
    """Request model for explaining a topic"""
    topic: str = Field(..., description="The speaking topic to explain")
    category: str = Field(..., description="The category of the topic")


class ExplainResponse(BaseModel):
    """Response model for explaining a topic"""
    explanation: str = Field(..., description="The detailed explanation of the topic")


# ==================== GROQ CLIENT ====================

def get_groq_client() -> Optional[Groq]:
    """
    Initialize and return the Groq client.
    
    Returns:
        Groq client instance or None if API key is not configured
        
    Environment Variables:
        GROQ_API_KEY: Your Groq API key (get it from https://console.groq.com)
    """
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        logger.warning("GROQ_API_KEY not set in environment variables")
        return None
    
    try:
        return Groq(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
        return None


# Cache the determined best model
_best_model: Optional[str] = None

def get_best_model(client: Groq) -> str:
    """
    Find the first available model from a list of preferred models.
    """
    global _best_model
    if _best_model:
        return _best_model
        
    preferred_models = [
        "llama-3.1-8b-instant",
        "llama3-8b-8192",
        "groq/compound-mini",
        "groq/compound",
        "qwen/qwen3.6-27b",
    ]
    
    try:
        models = client.models.list()
        available_ids = []
        if hasattr(models, 'data'):
            available_ids = [m.id for m in models.data]
        elif isinstance(models, list):
            available_ids = [m.id if hasattr(m, 'id') else m for m in models]
        else:
            available_ids = [getattr(m, 'id', str(m)) for m in models]
            
        for model in preferred_models:
            if model in available_ids:
                _best_model = model
                logger.info(f"Using preferred Groq model: {model}")
                return model
                
        if available_ids:
            for m_id in available_ids:
                if "whisper" not in m_id.lower() and "guard" not in m_id.lower():
                    _best_model = m_id
                    logger.info(f"Using first available text Groq model: {m_id}")
                    return m_id
    except Exception as e:
        logger.error(f"Error checking available Groq models: {e}")
        
    _best_model = preferred_models[0]
    return _best_model


# ==================== TOPIC GENERATION ====================

# Category definitions with prompts for the AI
CATEGORY_PROMPTS = {
    "tech": {
        "name": "Technology",
        "topic_prompt": "Generate a thought-provoking topic about technology, software, AI, or innovation that someone could speak about for 60 seconds. Make it specific and engaging, not generic.",
        "hint_prompt": "Generate 3-4 quick talking points for this technology topic that a speaker could use to structure their response."
    },
    "science": {
        "name": "Science",
        "topic_prompt": "Generate a fascinating scientific topic or discovery that someone could discuss for 60 seconds. Make it accessible to a general audience.",
        "hint_prompt": "Generate 3-4 quick talking points for this science topic that would help someone structure a 60-second response."
    },
    "business": {
        "name": "Business",
        "topic_prompt": "Generate an interesting business or entrepreneurship topic for a 60-second impromptu speech. Make it relevant to modern business trends.",
        "hint_prompt": "Generate 3-4 quick talking points for this business topic to help structure a response."
    },
    "sports": {
        "name": "Sports",
        "topic_prompt": "Generate an engaging sports-related topic for a 60-second impromptu speech. Can include athletics, teamwork, competition, or sports culture.",
        "hint_prompt": "Generate 3-4 quick talking points for this sports topic."
    },
    "entertainment": {
        "name": "Entertainment",
        "topic_prompt": "Generate an interesting entertainment, film, music, or pop culture topic for a 60-second speech.",
        "hint_prompt": "Generate 3-4 quick talking points for this entertainment topic."
    },
    "lifestyle": {
        "name": "Lifestyle",
        "topic_prompt": "Generate a lifestyle, wellness, or personal development topic for a 60-second impromptu speech.",
        "hint_prompt": "Generate 3-4 quick talking points for this lifestyle topic."
    },
    "history": {
        "name": "History",
        "topic_prompt": "Generate an interesting historical topic or lesson that could be discussed in 60 seconds.",
        "hint_prompt": "Generate 3-4 quick talking points for this history topic."
    },
    "society": {
        "name": "Society",
        "topic_prompt": "Generate a thought-provoking social issue, cultural topic, or societal trend for a 60-second speech.",
        "hint_prompt": "Generate 3-4 quick talking points for this society topic."
    }
}

# Fallback topics in case Groq API is not configured
FALLBACK_TOPICS = {
    "tech": [
        "The impact of artificial intelligence on daily life",
        "Should software companies be responsible for bugs?",
        "The future of remote work and digital nomads",
        "Is technology making us more or less connected?",
        "The ethical implications of self-driving cars",
        "How virtual reality will change education in the next decade",
        "The rise of cryptocurrency and the future of physical money",
        "Should social media platforms be regulated like public utilities?",
        "The threat of cyberwarfare and how nations can protect themselves",
        "Is the concept of privacy completely dead in the digital age?"
    ],
    "science": [
        "The most exciting scientific discovery of the 21st century",
        "Should scientists be allowed to edit human DNA?",
        "The importance of space exploration",
        "How will climate change affect our future?",
        "The possibility of life on other planets and what it means for humanity",
        "How deep-sea exploration compares to space exploration",
        "The potential of fusion energy as a clean power source",
        "Why biodiversity is critical for the survival of ecosystems",
        "The science of sleep and its impact on human performance",
        "Will quantum computing solve problems classical computers cannot?"
    ],
    "business": [
        "The rise of side hustles in the modern economy",
        "Is a college degree still worth it?",
        "The importance of failure in entrepreneurship",
        "Should businesses prioritize profits over ethics?",
        "How subscription models are changing consumer behavior",
        "The impact of inflation on small businesses",
        "Why emotional intelligence is critical for modern leadership",
        "The future of commercial real estate in a work-from-home world",
        "How big data is changing advertising and marketing",
        "The pros and cons of universal basic income for workers"
    ],
    "sports": [
        "The value of teamwork in achieving goals",
        "Should athletes be role models?",
        "The mental health crisis in professional sports",
        "Are professional athletes overpaid?",
        "The rise of e-sports and whether they should be in the Olympics",
        "How technology (like video review) is changing sports refereeing",
        "The impact of hosting the Olympic Games on a city's economy",
        "Should college athletes be paid salaries?",
        "The role of sports in bringing divided communities together",
        "Why youth sports participation is declining in some countries"
    ],
    "entertainment": [
        "The impact of streaming on the film industry",
        "Should movies have trigger warnings?",
        "The role of music in emotional well-being",
        "Is social media changing celebrity culture?",
        "Will AI-generated art and writing replace human creators?",
        "The power of storytelling in video games vs. traditional movies",
        "Why true crime documentaries are so popular today",
        "The evolution of comedy in the age of political correctness",
        "Is the era of the traditional movie star coming to an end?",
        "How representation in media affects societal perceptions"
    ],
    "lifestyle": [
        "The importance of work-life balance",
        "Minimalism vs. maximalism: which is better?",
        "The benefits of morning routines",
        "How to maintain relationships in a busy world",
        "The impact of fast fashion on the environment and society",
        "Why mental health days should be treated like sick days",
        "The growth of plant-based diets and their lifestyle impact",
        "How micro-habits can lead to major life transformations",
        "The art of slow living in a fast-paced society",
        "Should children's screen time be strictly regulated by parents?"
    ],
    "history": [
        "What history can teach us about current events",
        "The most underrated historical figure",
        "Lessons from ancient civilizations",
        "How history repeats itself",
        "The impact of the printing press on human knowledge",
        "How the industrial revolution reshaped family structures",
        "The significance of the space race during the Cold War",
        "How historical trade routes (like the Silk Road) shaped globalization",
        "The role of propaganda in 20th-century conflicts",
        "Why preserving historical monuments is important for future generations"
    ],
    "society": [
        "The impact of social media on mental health",
        "Should voting be mandatory?",
        "The importance of diversity in the workplace",
        "Is cancel culture good or bad for society?",
        "How urbanization is changing human interactions",
        "The challenges of an aging population in developed nations",
        "Should internet access be considered a basic human right?",
        "The role of education in reducing economic inequality",
        "How filter bubbles online are polarizing political discourse",
        "The impact of volunteerism and community service on local societies"
    ]
}

FALLBACK_HINTS = [
    "Start with a personal story or example",
    "Present two sides of the argument",
    "Use a statistic or fact to support your point",
    "End with a call to action or reflection",
]


async def generate_topic_with_groq(category: str) -> tuple[str, List[str]]:
    """
    Generate a topic and hints using the Groq API.
    
    Args:
        category: The category ID for topic generation
        
    Returns:
        Tuple of (topic, hints)
    """
    client = get_groq_client()
    
    if not client:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set GROQ_API_KEY."
        )
    
    category_info = CATEGORY_PROMPTS.get(category)
    if not category_info:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    try:
        model = get_best_model(client)
        # Generate topic
        topic_response = client.chat.completions.create(
            model=model,  # Fast, capable model
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise topic generator for impromptu speaking. You must output ONLY a single concise sentence or question that serves as the speaking topic. Do NOT include any explanations, bullet points, introduction, formatting like 'Topic:', or 'Why it works'. Keep it short and under 20 words (less than 2 lines)."
                },
                {
                    "role": "user",
                    "content": f"{category_info['topic_prompt']} Output ONLY the topic itself as a single concise question or statement. Do not exceed 20 words."
                }
            ],
            temperature=0.8,  # Some creativity
            max_tokens=150,
        )
        
        topic = topic_response.choices[0].message.content.strip()
        
        # Generate hints
        hints_response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that provides brief talking points. Generate 3-4 concise bullet points that help structure a 60-second speech."
                },
                {
                    "role": "user",
                    "content": f"{category_info['hint_prompt']}\n\nTopic: {topic}"
                }
            ],
            temperature=0.7,
            max_tokens=200,
        )
        
        hints_text = hints_response.choices[0].message.content.strip()
        
        # Parse hints - split by newlines or bullet points
        hints = []
        for line in hints_text.split('\n'):
            line = line.strip()
            # Remove common bullet prefixes
            if line.startswith(('- ', '* ', '• ', '1. ', '2. ', '3. ', '4. ')):
                line = line[2:].strip()
            if line and len(line) > 10:  # Filter out very short lines
                hints.append(line)
        
        # Ensure we have at least some hints
        if not hints:
            hints = FALLBACK_HINTS.copy()
        
        return topic, hints[:4]  # Limit to 4 hints
        
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to generate topic: {str(e)}"
        )


def get_fallback_topic(category: str) -> tuple[str, List[str]]:
    """
    Get a random fallback topic when AI is not available.
    
    Args:
        category: The category ID
        
    Returns:
        Tuple of (topic, hints)
    """
    import random
    
    topics = FALLBACK_TOPICS.get(category, FALLBACK_TOPICS["tech"])
    topic = random.choice(topics)
    hints = FALLBACK_HINTS.copy()
    
    return topic, hints


# ==================== API ENDPOINTS ====================

@app.get("/", response_model=HealthResponse)
async def root():
    """
    Root endpoint - returns API status.
    """
    return HealthResponse(
        status="ok",
        message="MinuteTalk AI API is running. Use /api/topic to generate topics."
    )


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns:
        Health status of the API
    """
    # Check if Groq is configured
    groq_available = os.environ.get('GROQ_API_KEY') is not None
    
    return HealthResponse(
        status="healthy" if groq_available else "degraded",
        message="Groq API connected" if groq_available else "Using fallback topics (GROQ_API_KEY not set)"
    )


@app.post("/api/topic", response_model=TopicResponse)
async def generate_topic(request: TopicRequest):
    """
    Generate a random speaking topic for the given category.
    
    This endpoint:
    1. Validates the category
    2. Attempts to use Groq for AI-generated topic
    3. Falls back to pre-defined topics if AI is unavailable
    
    Args:
        request: TopicRequest with category
        
    Returns:
        TopicResponse with topic and hints
        
    Example Request:
        ```json
        {
            "category": "tech"
        }
        ```
        
    Example Response:
        ```json
        {
            "topic": "The future of artificial intelligence in everyday life",
            "hints": [
                "Start with a personal example of AI you use daily",
                "Discuss both benefits and concerns",
                "Mention a specific prediction for the next 5 years"
            ],
            "category": "tech"
        }
        ```
    """
    category = request.category.lower()
    
    # Validate category
    if category not in CATEGORY_PROMPTS:
        valid_categories = ", ".join(CATEGORY_PROMPTS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Valid categories: {valid_categories}"
        )
    
    # Check if Groq is available
    if os.environ.get('GROQ_API_KEY'):
        try:
            topic, hints = await generate_topic_with_groq(category)
            return TopicResponse(
                topic=topic,
                hints=hints,
                category=category
            )
        except Exception as e:
            logger.warning(f"Groq failed, using fallback: {e}")
            # Fall through to fallback topics below
    
    # Fallback to pre-defined topics
    topic, hints = get_fallback_topic(category)
    logger.info(f"Using fallback topic for category: {category}")
    
    return TopicResponse(
        topic=topic,
        hints=hints,
        category=category
    )


@app.post("/api/explain", response_model=ExplainResponse)
async def explain_topic(request: ExplainRequest):
    """
    Explain the given speaking topic, providing context and key angles.
    """
    topic = request.topic
    category = request.category.lower()
    
    # Check if Groq is available
    if os.environ.get('GROQ_API_KEY'):
        try:
            client = get_groq_client()
            if client:
                model = get_best_model(client)
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an impromptu speaking coach. Provide a concise, clear explanation of the given topic. Explain what the topic means and suggest 2-3 key angles or viewpoints the speaker could explore in a 60-second speech. Keep your response brief, friendly, and structured, under 150 words."
                        },
                        {
                            "role": "user",
                            "content": f"Topic: {topic}\nCategory: {category}"
                        }
                    ],
                    temperature=0.7,
                    max_tokens=250,
                )
                explanation = response.choices[0].message.content.strip()
                return ExplainResponse(explanation=explanation)
        except Exception as e:
            logger.warning(f"Groq explanation failed: {e}")
            
    # Fallback explanation if Groq is not configured or fails
    fallback_explanation = f"This topic focuses on {category}. Think about how it affects individuals, society, or businesses. Consider the pros and cons, and structure your speech with an introduction, main point, and conclusion."
    return ExplainResponse(explanation=fallback_explanation)


# ==================== MANGUM HANDLER ====================

# Create the ASGI handler for AWS Lambda
handler = Mangum(app, lifespan="off")

"""
AWS Lambda Handler

This handler is used by AWS Lambda to process API Gateway requests.
The Mangum adapter converts the API Gateway event to ASGI format
that FastAPI can process.

In your AWS Lambda configuration:
- Set the Handler to: backend.app.main.handler

The lambda_function.py in the amplify folder should import this handler.
"""


if __name__ == "__main__":
    """
    Local development server
    
    Run with: uvicorn backend.app.main:app --reload --port 8000
    
    For local testing, create a .env file with:
    GROQ_API_KEY=your_api_key_here
    """
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
