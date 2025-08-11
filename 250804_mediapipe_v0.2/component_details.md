# MediaPipe Pose 게임 - 컴포넌트별 구현 내용

## 1. Frontend Components

### 1.1 HTML Template (`frontend/templates/index.html`)
**구현 목적**: 사용자 인터페이스 및 MediaPipe 라이브러리 로딩

**주요 구현 내용**:
- **MediaPipe 라이브러리 로딩**: CDN에서 특정 버전의 라이브러리 로드
- **카메라 권한 요청 UI**: 사용자가 쉽게 권한을 허용할 수 있는 버튼
- **실시간 좌표 표시 영역**: 포즈 랜드마크 좌표를 실시간으로 표시
- **녹화 컨트롤**: 녹화 시작/중지 버튼 및 상태 표시
- **벽모양 포즈 표시**: 따라할 포즈를 오른쪽 화면에 표시

**개발 의사결정**:
- 라이브러리 버전을 고정하여 호환성 문제 해결
- 브라우저별 권한 설정 안내 추가
- 반응형 디자인으로 다양한 화면 크기 지원

### 1.2 JavaScript Application (`frontend/static/script.js`)
**구현 목적**: MediaPipe Pose 감지 및 실시간 렌더링

**주요 구현 내용**:

#### A. MediaPipe 초기화 (`initializePose()`)
```javascript
// 라이브러리 로딩 대기 로직
while ((typeof Pose === "undefined" || typeof Camera === "undefined") && attempts < 100) {
  await new Promise(resolve => setTimeout(resolve, 100));
  attempts++;
}
```
**개발 의사결정**: 
- 비동기 로딩을 고려한 대기 로직 구현
- 최대 100회까지 재시도하여 안정성 확보
- Camera 객체도 함께 확인하여 완전한 초기화 보장

#### B. 실시간 좌표 표시 (`updateCoordinateDisplay()`)
```javascript
landmarks.forEach((landmark, index) => {
  if (landmark.visibility > 0.5) {
    const x = (landmark.x * 100).toFixed(1);
    const y = (landmark.y * 100).toFixed(1);
    const z = (landmark.z * 100).toFixed(1);
    const visibility = (landmark.visibility * 100).toFixed(1);
    
    html += `<div>Point ${index}: x=${x}%, y=${y}%, z=${z}%, vis=${visibility}%</div>`;
  }
});
```
**개발 의사결정**:
- 가시성(visibility) 0.5 이상인 랜드마크만 표시
- 퍼센트 단위로 변환하여 사용자 친화적 표시
- 스크롤 가능한 영역으로 많은 데이터 처리

#### C. Skeleton 그리기 (`drawCustomSkeleton()`)
```javascript
const connections = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 어깨-팔
  [11, 23], [12, 24], [23, 24], // 몸통
  [23, 25], [25, 27], [27, 29], [29, 31], // 왼쪽 다리
  [24, 26], [26, 28], [28, 30], [30, 32], // 오른쪽 다리
];
```
**개발 의사결정**:
- MediaPipe 기본 함수 실패 시 대체 방법 제공
- 주요 연결선만 그려서 성능 최적화
- 가시성 기반 필터링으로 정확도 향상

#### D. Linux Time 기준 저장 (`savePoseData()`)
```javascript
const timestamp = getLinuxTimestamp();
const poseData = {
  timestamp: timestamp,
  unix_time: Date.now(),
  landmarks: landmarks.map(lm => ({
    x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility
  }))
};
```
**개발 의사결정**:
- Unix timestamp 사용으로 정확한 시간 기록
- 모든 랜드마크 정보를 포함하여 완전한 데이터 저장
- 실시간 서버 전송으로 데이터 손실 방지

### 1.3 녹화 시스템
**구현 목적**: 포즈 데이터 수집 및 저장

**주요 구현 내용**:
- **녹화 시작/중지**: 토글 버튼으로 간편한 제어
- **실시간 데이터 전송**: 서버에 실시간으로 데이터 전송
- **자동 파일 다운로드**: 녹화 완료 시 JSON 파일 자동 다운로드
- **상태 표시**: 녹화 중 상태를 실시간으로 표시

## 2. Backend Components

### 2.1 FastAPI Server (`backend/main.py`)
**구현 목적**: 데이터 저장 및 API 제공

**주요 구현 내용**:

#### A. 포즈 데이터 저장 (`save_pose_data_api()`)
```python
@app.post("/save_pose_data")
async def save_pose_data_api(data: PoseDataSave):
    os.makedirs("pose_data", exist_ok=True)
    filename = f"pose_data_{data.timestamp}.json"
    filepath = os.path.join("pose_data", filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data.dict(), f, indent=2, ensure_ascii=False)
```
**개발 의사결정**:
- Linux timestamp를 파일명으로 사용하여 고유성 보장
- JSON 형태로 저장하여 데이터 분석 용이성 확보
- UTF-8 인코딩으로 한글 지원

#### B. 포즈 비교 로직 (`compare_pose_api()`)
```python
@app.post("/compare_pose")
async def compare_pose_api(data: PoseData):
    result = compare_pose(data.keypoints)
    return {"result": result}
```
**개발 의사결정**:
- 기존 포즈 비교 로직 재사용
- RESTful API 설계로 확장성 확보

### 2.2 파일 관리 시스템
**구현 목적**: 데이터 영속성 및 관리

**주요 구현 내용**:
- **자동 디렉토리 생성**: `pose_data/` 디렉토리 자동 생성
- **파일명 규칙**: `pose_data_[timestamp].json` 형태
- **에러 처리**: 파일 저장 실패 시 적절한 에러 메시지 반환

## 3. 개발 과정에서의 주요 의사결정

### 3.1 라이브러리 로딩 전략
**문제**: MediaPipe 라이브러리가 비동기적으로 로드되어 초기화 실패
**해결책**: 
- 특정 버전 고정으로 호환성 확보
- 대기 로직 구현으로 안정성 향상
- 에러 처리 강화로 사용자 경험 개선

### 3.2 Skeleton 렌더링 전략
**문제**: MediaPipe 기본 그리기 함수가 일부 환경에서 작동하지 않음
**해결책**:
- 기본 함수 우선 사용 시도
- 실패 시 대체 그리기 함수 사용
- 가시성 기반 필터링으로 정확도 향상

### 3.3 데이터 저장 전략
**문제**: 실시간 데이터 수집 및 영속성 보장
**해결책**:
- Linux timestamp 사용으로 정확한 시간 기록
- 실시간 서버 전송으로 데이터 손실 방지
- JSON 형태로 저장하여 분석 용이성 확보

### 3.4 사용자 경험 개선
**문제**: 카메라 권한 및 기술적 문제로 인한 사용자 혼란
**해결책**:
- 단계별 안내 UI 구현
- 브라우저별 설정 가이드 제공
- 실시간 상태 표시로 피드백 제공

## 4. 성능 최적화 전략

### 4.1 렌더링 최적화
- Canvas 크기 명시적 설정
- 불필요한 랜드마크 필터링
- 프레임 처리 최적화

### 4.2 메모리 관리
- 스트림 정리 로직 구현
- 데이터 로그 크기 제한
- 가비지 컬렉션 고려

### 4.3 네트워크 최적화
- 실시간 데이터 전송
- 에러 시 재시도 로직
- 연결 상태 모니터링

## 5. 확장성 고려사항

### 5.1 모듈화 설계
- 각 기능을 독립적인 함수로 분리
- 재사용 가능한 컴포넌트 설계
- 테스트 용이성 확보

### 5.2 API 설계
- RESTful API 원칙 준수
- 확장 가능한 엔드포인트 구조
- 버전 관리 고려

### 5.3 데이터 구조
- JSON 형태로 유연한 데이터 구조
- 스키마 버전 관리 가능
- 향후 기능 추가 고려 