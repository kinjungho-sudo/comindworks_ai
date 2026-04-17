from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import collect, dashboard, pages

app = FastAPI(title="LLM Wiki API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(collect.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(pages.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
