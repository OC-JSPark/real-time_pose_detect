from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
# from backend.pose_logic import process_image_and_compare

from pose_logic import process_image_and_compare
from pydantic import BaseModel
import json
import os
from datetime import datetime

from pose_logic_compare import compare_pose 

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
templates = Jinja2Templates(directory="../frontend/templates")



class PoseData(BaseModel):
    keypoints: list

class PoseDataSave(BaseModel):
    timestamp: int
    unix_time: int
    landmarks: list



@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/compare_pose")
async def compare_pose_api(data: PoseData):
    result = compare_pose(data.keypoints)
    return {"result": result}


@app.post("/save_pose_data")
async def save_pose_data_api(data: PoseDataSave):
    try:
        # 데이터 저장 디렉토리 생성
        os.makedirs("pose_data", exist_ok=True)
        
        # Linux timestamp를 파일명으로 사용
        filename = f"pose_data_{data.timestamp}.json"
        filepath = os.path.join("pose_data", filename)
        
        # 데이터를 JSON 파일로 저장
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=2, ensure_ascii=False)
        
        print(f"포즈 데이터 저장됨: {filepath}")
        return {"status": "success", "filename": filename}
        
    except Exception as e:
        print(f"포즈 데이터 저장 실패: {e}")
        return {"status": "error", "message": str(e)}


## upload된 image를 비교하기 위한 함수
@app.post("/pose/process")
async def pose_process(image: UploadFile = File(...)):
    content = await image.read()
    result = process_image_and_compare(content)
    return {"result": result}

# if __name__ == "__main__":
#     uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)




