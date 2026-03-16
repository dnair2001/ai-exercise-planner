import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import engine, Base
from routers import auth, plans

load_dotenv()

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Exercise Planner API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Exercise Planner API"}
