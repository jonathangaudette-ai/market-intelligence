"""FastAPI main application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import init_db
from app.db.pinecone_client import init_pinecone
from app.api import chat, documents

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("🚀 Initializing Market Intelligence RAG API...")

    # Initialize database
    print("📊 Initializing PostgreSQL...")
    await init_db()

    # Initialize Pinecone
    print("🔍 Initializing Pinecone...")
    await init_pinecone()

    print("✅ API Ready!")

    yield

    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI backend with RAG for competitive intelligence",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(chat.router)
app.include_router(documents.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )
