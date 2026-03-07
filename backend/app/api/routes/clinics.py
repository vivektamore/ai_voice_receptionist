from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_clinics():
    return {"message": "Get clinics"}
