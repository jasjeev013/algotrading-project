from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_root():
    return {"status": "success", "message": "QuantDash Backend is running!"}
