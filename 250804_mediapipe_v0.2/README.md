# Pose Game App (벽 통과 게임)

FastAPI + Mediapipe 기반 신체 포즈 인식 게임입니다.

## 구조
- `backend/` : FastAPI 서버, Mediapipe 포즈 분석
- `frontend/` : HTML/JS 프론트엔드, 웹캠 캡처, 타이머

## 설치 방법

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

## frontend 에서 mediapipe가 적용됨
