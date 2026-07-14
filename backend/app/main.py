from fastapi import FastAPI

from app.core.config import settings


app = FastAPI(
    title=settings.app_name,
    description="위치 기반 공공화장실 찾기 서비스 API",
    version="0.1.0",
)


@app.get("/")
def read_root():
    return {"message": f"{settings.app_name}가 실행 중입니다."}


@app.get("/health")
def health_check():
    return {"status": "ok"}