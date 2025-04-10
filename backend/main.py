from fastapi import FastAPI

app = FastAPI(title="Secure Chat Backend")


@app.get("/")
async def read_root():
    return {"message": "Welcome to Secure Chat Backend"}

from app.api import auth as auth_router
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])