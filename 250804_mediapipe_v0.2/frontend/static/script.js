// script.js - 개선된 MediaPipe Pose 애플리케이션

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusBox = document.getElementById("status");

let pose;  // 전역 변수로 선언
let lastResult = "fail";
let poseMatched = false;
let poseDetected = false; // 포즈 감지 상태 추가

let timer = 5;
let countdownStarted = false;

// 실시간 좌표 저장을 위한 변수들
let poseDataLog = [];
let isRecording = false;
let recordingStartTime = null;

// 벽모양 포즈 데이터 (개선된 버전)
const wallPoses = [
  {
    name: "T자 포즈",
    keypoints: [
      { x: 0.5, y: 0.2 }, // 머리
      { x: 0.5, y: 0.4 }, // 어깨
      { x: 0.3, y: 0.6 }, // 왼팔
      { x: 0.7, y: 0.6 }, // 오른팔
      { x: 0.5, y: 0.8 }  // 다리
    ]
  },
  {
    name: "V자 포즈", 
    keypoints: [
      { x: 0.5, y: 0.2 }, // 머리
      { x: 0.5, y: 0.4 }, // 어깨
      { x: 0.2, y: 0.8 }, // 왼팔
      { x: 0.8, y: 0.8 }, // 오른팔
      { x: 0.5, y: 0.9 }  // 다리
    ]
  },
  {
    name: "X자 포즈",
    keypoints: [
      { x: 0.5, y: 0.2 }, // 머리
      { x: 0.5, y: 0.4 }, // 어깨
      { x: 0.2, y: 0.7 }, // 왼팔
      { x: 0.8, y: 0.7 }, // 오른팔
      { x: 0.3, y: 0.9 }, // 왼다리
      { x: 0.7, y: 0.9 }  // 오른다리
    ]
  }
];

let currentWallPose = wallPoses[0]; // 현재 표시할 벽모양

// Linux Time 기준으로 현재 시간 가져오기
function getLinuxTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// 실시간 좌표 표시 업데이트
function updateCoordinateDisplay(landmarks) {
  const coordDisplay = document.getElementById('coordinate-display');
  if (!coordDisplay || !landmarks) return;
  
  let html = '<h4>📊 실시간 포즈 좌표</h4>';
  html += '<div style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">';
  
  landmarks.forEach((landmark, index) => {
    if (landmark.visibility > 0.5) {
      const x = (landmark.x * 100).toFixed(1);
      const y = (landmark.y * 100).toFixed(1);
      const z = (landmark.z * 100).toFixed(1);
      const visibility = (landmark.visibility * 100).toFixed(1);
      
      html += `<div>Point ${index}: x=${x}%, y=${y}%, z=${z}%, vis=${visibility}%</div>`;
    }
  });
  
  html += '</div>';
  coordDisplay.innerHTML = html;
}

// 포즈 데이터 저장
function savePoseData(landmarks) {
  if (!isRecording || !landmarks) return;
  
  const timestamp = getLinuxTimestamp();
  const poseData = {
    timestamp: timestamp,
    unix_time: Date.now(),
    landmarks: landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility
    }))
  };
  
  poseDataLog.push(poseData);
  
  // 실시간으로 서버에 전송
  sendPoseDataToServer(poseData);
}

// 서버에 포즈 데이터 전송
async function sendPoseDataToServer(poseData) {
  try {
    await fetch("/save_pose_data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(poseData)
    });
  } catch (error) {
    console.error("포즈 데이터 전송 실패:", error);
  }
}

// 녹화 시작/중지 토글
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// 녹화 시작
function startRecording() {
  isRecording = true;
  recordingStartTime = getLinuxTimestamp();
  poseDataLog = [];
  
  const recordButton = document.getElementById('record-button');
  if (recordButton) {
    recordButton.textContent = '⏹️ 녹화 중지';
    recordButton.style.backgroundColor = '#dc3545';
  }
  
  console.log(`녹화 시작: ${recordingStartTime}`);
  statusBox.textContent = `📹 녹화 시작됨 (${new Date(recordingStartTime * 1000).toLocaleString()})`;
}

// 녹화 중지
function stopRecording() {
  isRecording = false;
  const recordButton = document.getElementById('record-button');
  if (recordButton) {
    recordButton.textContent = '🔴 녹화 시작';
    recordButton.style.backgroundColor = '#007bff';
  }
  
  console.log(`녹화 중지: ${poseDataLog.length}개 데이터 수집됨`);
  statusBox.textContent = `📹 녹화 완료 (${poseDataLog.length}개 데이터)`;
  
  // 데이터 다운로드
  downloadPoseData();
}

// 포즈 데이터 다운로드
function downloadPoseData() {
  if (poseDataLog.length === 0) return;
  
  const data = {
    recording_start_time: recordingStartTime,
    recording_end_time: getLinuxTimestamp(),
    total_frames: poseDataLog.length,
    pose_data: poseDataLog
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pose_data_${recordingStartTime}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 간단한 그리기 유틸리티 함수들
function drawConnectors(ctx, landmarks, connections, options = {}) {
  const { color = '#00FF00', lineWidth = 2 } = options;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  
  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
      ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
    }
  });
  
  ctx.stroke();
}

function drawLandmarks(ctx, landmarks, options = {}) {
  const { color = '#FF0000', lineWidth = 2 } = options;
  
  landmarks.forEach(landmark => {
    if (landmark.visibility > 0.5) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        landmark.x * ctx.canvas.width,
        landmark.y * ctx.canvas.height,
        lineWidth,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  });
}

// 포즈 감지 상태 표시 업데이트
function updatePoseDetectionStatus() {
  const poseDetectedElement = document.querySelector('.pose-detected');
  if (poseDetectedElement) {
    if (poseDetected) {
      poseDetectedElement.textContent = "✅ 포즈 감지됨";
      poseDetectedElement.style.display = "block";
    } else {
      poseDetectedElement.textContent = "❌ 포즈 감지 안됨";
      poseDetectedElement.style.display = "block";
    }
  }
}

// Mediapipe Pose 객체 초기화 및 설정
async function initializePose() {
  try {
    console.log("MediaPipe Pose 초기화 시작...");
    console.log("Pose 객체 존재 여부:", typeof Pose !== "undefined");
    console.log("Camera 객체 존재 여부:", typeof Camera !== "undefined");
    console.log("drawConnectors 함수:", typeof drawConnectors);
    console.log("drawLandmarks 함수:", typeof drawLandmarks);
    
    // MediaPipe 라이브러리가 로드될 때까지 대기
    let attempts = 0;
    while ((typeof Pose === "undefined" || typeof Camera === "undefined") && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      console.log(`MediaPipe 로딩 대기 중... (${attempts}/100)`);
    }
    
    if (typeof Pose === "undefined") {
      throw new Error("MediaPipe Pose 라이브러리가 로드되지 않았습니다.");
    }
    
    if (typeof Camera === "undefined") {
      throw new Error("MediaPipe Camera 라이브러리가 로드되지 않았습니다.");
    }
    
    pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onPoseResults);
    
    console.log("✅ MediaPipe Pose 초기화 성공");
    return true;
  } catch (error) {
    console.error("❌ Pose 초기화 에러:", error);
    statusBox.textContent = "❌ Pose 초기화 에러가 발생했습니다: " + error.message;
    return false;
  }
}

// 포즈 결과 처리 함수
function onPoseResults(results) {
  try {
    console.log("포즈 결과 처리 시작");
    
    // Canvas 크기 설정 확인
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 480;
      canvas.height = 360;
      console.log("Canvas 크기 설정:", canvas.width, "x", canvas.height);
    }
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 원본 비디오 이미지 그리기
    if (results.image) {
      console.log("이미지 그리기 시작");
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      console.log("이미지 그리기 완료");
    } else {
      console.log("결과 이미지가 없습니다");
    }

    if (results.poseLandmarks) {
      console.log("포즈 랜드마크 감지됨:", results.poseLandmarks.length, "개");
      poseDetected = true;
      
      // 포즈 랜드마크 그리기 - 더 안정적인 방법
      try {
        // MediaPipe의 기본 그리기 함수 사용
        if (typeof drawConnectors !== "undefined" && typeof drawLandmarks !== "undefined") {
          // Skeleton 연결선 그리기
          drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, { 
            color: "#00FF00", 
            lineWidth: 3 
          });
          
          // 랜드마크 점 그리기
          drawLandmarks(ctx, results.poseLandmarks, { 
            color: "#FF0000", 
            lineWidth: 2 
          });
          
          console.log("포즈 랜드마크 그리기 완료");
        } else {
          // 대체 그리기 방법
          console.log("MediaPipe 그리기 함수를 사용할 수 없어 대체 방법 사용");
          drawCustomSkeleton(ctx, results.poseLandmarks);
        }
      } catch (error) {
        console.error("Skeleton 그리기 에러:", error);
        // 에러 발생 시 대체 그리기 방법 사용
        drawCustomSkeleton(ctx, results.poseLandmarks);
      }

      // Pose keypoints를 간단히 {x, y} 좌표 배열로 추출
      const keypoints = results.poseLandmarks.map(lm => ({ x: lm.x, y: lm.y }));

      // 타이머가 시작되지 않았다면 시작
      if (!countdownStarted) {
        countdownStarted = true;
        startCountdown();
      }

      // 백엔드에 포즈 keypoints 전송하여 비교 요청
      comparePoseWithBackend(keypoints);
      
      // 벽모양 포즈 그리기 (오른쪽에)
      drawWallPose();
      
      // 실시간 좌표 저장 및 표시
      savePoseData(results.poseLandmarks);
      updateCoordinateDisplay(results.poseLandmarks);
      
    } else {
      console.log("포즈 랜드마크가 감지되지 않음");
      poseDetected = false;
    }

    // 포즈 감지 상태 업데이트
    updatePoseDetectionStatus();
    
    ctx.restore();
    console.log("포즈 결과 처리 완료");
  } catch (error) {
    console.error("포즈 결과 처리 에러:", error);
  }
}

// 대체 Skeleton 그리기 함수
function drawCustomSkeleton(ctx, landmarks) {
  if (!landmarks || landmarks.length === 0) return;
  
  console.log("대체 Skeleton 그리기 시작");
  
  // 주요 연결선 정의 (MediaPipe Pose 연결선과 유사)
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 어깨-팔
    [11, 23], [12, 24], [23, 24], // 몸통
    [23, 25], [25, 27], [27, 29], [29, 31], // 왼쪽 다리
    [24, 26], [26, 28], [28, 30], [30, 32], // 오른쪽 다리
    [15, 17], [15, 19], [15, 21], // 왼쪽 손
    [16, 18], [16, 20], [16, 22], // 오른쪽 손
    [11, 12], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], // 오른쪽 팔 전체
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21] // 왼쪽 팔 전체
  ];
  
  // 연결선 그리기
  ctx.strokeStyle = "#00FF00";
  ctx.lineWidth = 3;
  
  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end] && 
        landmarks[start].visibility > 0.5 && landmarks[end].visibility > 0.5) {
      
      const startX = landmarks[start].x * ctx.canvas.width;
      const startY = landmarks[start].y * ctx.canvas.height;
      const endX = landmarks[end].x * ctx.canvas.width;
      const endY = landmarks[end].y * ctx.canvas.height;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
  
  // 랜드마크 점 그리기
  ctx.fillStyle = "#FF0000";
  landmarks.forEach(landmark => {
    if (landmark.visibility > 0.5) {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  
  console.log("대체 Skeleton 그리기 완료");
}

// 백엔드와 포즈 비교
async function comparePoseWithBackend(keypoints) {
  try {
    const res = await fetch("/compare_pose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keypoints })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    lastResult = data.result;
    
    if (lastResult === "pass") {
      poseMatched = true;
    }
  } catch (err) {
    console.error("서버와 통신 실패:", err);
    // 서버 통신 실패 시에도 계속 진행
  }
}

// 벽모양 포즈 그리기
function drawWallPose() {
  try {
    const wallCanvas = document.getElementById('wall-canvas');
    if (!wallCanvas) {
      console.error("wall-canvas 요소를 찾을 수 없습니다.");
      return;
    }
    
    const wallCtx = wallCanvas.getContext('2d');
    wallCtx.clearRect(0, 0, wallCanvas.width, wallCanvas.height);
    
    // 벽모양 배경
    wallCtx.fillStyle = '#f0f0f0';
    wallCtx.fillRect(0, 0, wallCanvas.width, wallCanvas.height);
    
    // 벽모양 제목
    wallCtx.fillStyle = '#000';
    wallCtx.font = 'bold 20px Arial';
    wallCtx.textAlign = 'center';
    wallCtx.fillText(currentWallPose.name, wallCanvas.width/2, 30);
    
    // 벽모양 포즈 그리기 - 더 명확한 선과 점으로
    wallCtx.strokeStyle = '#0066FF';
    wallCtx.lineWidth = 6;
    wallCtx.beginPath();
    
    const scaleX = wallCanvas.width;
    const scaleY = wallCanvas.height;
    
    // 포즈 연결선 그리기
    const connections = [
      [0, 1], // 머리-어깨
      [1, 2], // 어깨-왼팔
      [1, 3], // 어깨-오른팔
      [2, 4], // 왼팔-왼다리 (T자)
      [3, 4], // 오른팔-오른다리 (T자)
      [4, 5]  // 왼다리-오른다리 (X자)
    ];
    
    // 연결선 그리기
    connections.forEach(([start, end]) => {
      if (currentWallPose.keypoints[start] && currentWallPose.keypoints[end]) {
        const startPoint = currentWallPose.keypoints[start];
        const endPoint = currentWallPose.keypoints[end];
        
        const startX = startPoint.x * scaleX;
        const startY = startPoint.y * scaleY;
        const endX = endPoint.x * scaleX;
        const endY = endPoint.y * scaleY;
        
        wallCtx.moveTo(startX, startY);
        wallCtx.lineTo(endX, endY);
      }
    });
    
    wallCtx.stroke();
    
    // 포인트 그리기
    currentWallPose.keypoints.forEach((point, index) => {
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      
      // 포인트 배경
      wallCtx.fillStyle = '#FFFFFF';
      wallCtx.beginPath();
      wallCtx.arc(x, y, 8, 0, 2 * Math.PI);
      wallCtx.fill();
      
      // 포인트 테두리
      wallCtx.strokeStyle = '#FF6600';
      wallCtx.lineWidth = 3;
      wallCtx.beginPath();
      wallCtx.arc(x, y, 8, 0, 2 * Math.PI);
      wallCtx.stroke();
      
      // 포인트 번호
      wallCtx.fillStyle = '#000';
      wallCtx.font = 'bold 12px Arial';
      wallCtx.textAlign = 'center';
      wallCtx.fillText(index + 1, x, y + 4);
    });
    
    console.log("벽모양 포즈 그리기 완료:", currentWallPose.name);
  } catch (error) {
    console.error("벽모양 포즈 그리기 에러:", error);
  }
}

// 초기화 시 벽모양 포즈 먼저 그리기
function initializeWallPose() {
  console.log("벽모양 포즈 초기화 시작");
  setTimeout(() => {
    drawWallPose();
    console.log("벽모양 포즈 초기화 완료");
  }, 100);
}

// 브라우저별 카메라 권한 설정 방법 안내
function showBrowserSpecificInstructions() {
  const userAgent = navigator.userAgent;
  let instructions = "";
  
  if (userAgent.includes("Chrome")) {
    instructions = `
      <div style="text-align: left; font-size: 14px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <strong>Chrome 브라우저 카메라 권한 설정:</strong><br>
        1. 주소창 왼쪽의 🔒 아이콘 클릭<br>
        2. "카메라" 옆의 드롭다운에서 "허용" 선택<br>
        3. 페이지 새로고침<br>
        <br>
        <strong>또는:</strong><br>
        1. 주소창에 "chrome://settings/content/camera" 입력<br>
        2. "허용" 목록에 현재 사이트 추가<br>
        3. 페이지 새로고침
      </div>
    `;
  } else if (userAgent.includes("Firefox")) {
    instructions = `
      <div style="text-align: left; font-size: 14px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <strong>Firefox 브라우저 카메라 권한 설정:</strong><br>
        1. 주소창 왼쪽의 🔒 아이콘 클릭<br>
        2. "카메라" 옆의 드롭다운에서 "허용" 선택<br>
        3. 페이지 새로고침<br>
        <br>
        <strong>또는:</strong><br>
        1. 주소창에 "about:preferences#privacy" 입력<br>
        2. "권한" 섹션에서 "카메라" 설정<br>
        3. 현재 사이트를 "허용" 목록에 추가
      </div>
    `;
  } else if (userAgent.includes("Safari")) {
    instructions = `
      <div style="text-align: left; font-size: 14px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <strong>Safari 브라우저 카메라 권한 설정:</strong><br>
        1. Safari > 환경설정 > 웹사이트<br>
        2. "카메라" 선택<br>
        3. 현재 사이트를 "허용"으로 설정<br>
        4. 페이지 새로고침
      </div>
    `;
  } else {
    instructions = `
      <div style="text-align: left; font-size: 14px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
        <strong>일반적인 카메라 권한 설정:</strong><br>
        1. 브라우저 주소창의 🔒 아이콘 클릭<br>
        2. "카메라" 권한을 "허용"으로 변경<br>
        3. 페이지 새로고침<br>
        <br>
        <strong>또는 브라우저 설정에서:</strong><br>
        1. 브라우저 설정 > 개인정보 보호<br>
        2. 카메라 권한 설정<br>
        3. 현재 사이트를 허용 목록에 추가
      </div>
    `;
  }
  
  return instructions;
}

// 웹캠 접근 및 Mediapipe와 연결하는 함수
async function startCamera() {
  try {
    console.log("카메라 연결 시작...");
    
    // 먼저 권한 상태 확인
    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
    console.log("카메라 권한 상태:", permissionStatus.state);
    
    if (permissionStatus.state === 'denied') {
      statusBox.textContent = "❌ 카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
      statusBox.innerHTML += showBrowserSpecificInstructions();
      return;
    }
    
    // 카메라 스트림 요청 시 더 구체적인 옵션 제공
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 480, min: 320, max: 1280 },
        height: { ideal: 360, min: 240, max: 720 },
        facingMode: 'user',
        frameRate: { ideal: 30, min: 10, max: 60 }
      },
      audio: false
    });
    
    console.log("카메라 스트림 획득 성공");
    video.srcObject = stream;
    
    // 비디오 로드 완료 대기
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        console.log("비디오 메타데이터 로드 완료");
        console.log("비디오 크기:", video.videoWidth, "x", video.videoHeight);
        resolve();
      };
    });

    if (!pose) {
      console.error("Pose 객체가 초기화되지 않았습니다.");
      statusBox.textContent = "❌ Pose 객체 초기화 실패";
      return;
    }

    console.log("Camera 객체 생성 시작...");
    
    // MediaPipe Camera 객체 사용
    if (typeof Camera !== "undefined") {
      const camera = new Camera(video, {
        onFrame: async () => {
          try {
            if (pose) {
              await pose.send({ image: video });
            }
          } catch (error) {
            console.error("Pose 처리 에러:", error);
          }
        },
        width: 480,
        height: 360
      });

      console.log("카메라 시작...");
      camera.start();
      console.log("✅ 카메라 연결 성공");
      statusBox.textContent = "✅ 카메라 연결 성공! 포즈를 감지하고 있습니다...";
    } else {
      console.error("Camera 객체가 없습니다. MediaPipe 라이브러리를 확인하세요.");
      statusBox.textContent = "❌ Camera 객체를 찾을 수 없습니다.";
      
      // 대체 방법: 직접 비디오 프레임 처리
      console.log("대체 방법으로 비디오 프레임 처리 시작");
      processVideoFrames();
    }
    
  } catch (err) {
    console.error("❌ 카메라 연결 실패:", err);
    
    // 구체적인 에러 메시지 제공
    let errorMessage = "❌ 카메라 접근이 차단되었습니다.";
    
    if (err.name === 'NotAllowedError') {
      errorMessage = "❌ 카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘을 클릭하여 권한을 허용해주세요.";
    } else if (err.name === 'NotFoundError') {
      errorMessage = "❌ 카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.";
    } else if (err.name === 'NotReadableError') {
      errorMessage = "❌ 카메라가 다른 애플리케이션에서 사용 중입니다. 다른 애플리케이션을 종료해주세요.";
    } else if (err.name === 'OverconstrainedError') {
      errorMessage = "❌ 요청한 카메라 설정을 지원하지 않습니다. 다른 카메라를 사용해주세요.";
    }
    
    statusBox.textContent = errorMessage;
    
    // 사용자에게 권한 허용 방법 안내
    setTimeout(() => {
      statusBox.innerHTML = `
        <div style="text-align: left; font-size: 16px;">
          <strong>카메라 권한 허용 방법:</strong><br>
          1. 브라우저 주소창 왼쪽의 🔒 아이콘 클릭<br>
          2. "카메라" 권한을 "허용"으로 변경<br>
          3. 페이지 새로고침<br>
          <br>
          <button onclick="location.reload()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            페이지 새로고침
          </button>
        </div>
        ${showBrowserSpecificInstructions()}
      `;
    }, 3000);
  }
}

// 대체 비디오 프레임 처리 함수
function processVideoFrames() {
  const processFrame = async () => {
    if (pose && video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        await pose.send({ image: video });
      } catch (error) {
        console.error("Pose 처리 에러:", error);
      }
    }
    requestAnimationFrame(processFrame);
  };
  
  processFrame();
}

// 5초 타이머 함수: 타이머 동작, 결과 출력, 상태 리셋
function startCountdown() {
  timer = 5;
  poseMatched = false;
  statusBox.textContent = `⏱️ 5초 안에 ${currentWallPose.name} 따라하기!`;

  const interval = setInterval(() => {
    timer -= 1;
    statusBox.textContent = `⏱️ 남은 시간: ${timer}초 - ${currentWallPose.name}`;

    if (timer <= 0) {
      clearInterval(interval);

      if (poseMatched) {
        statusBox.textContent = "✅ 성공! 통과!";
        // 다음 벽모양으로 변경
        changeWallPose();
      } else {
        statusBox.textContent = "❌ 실패! 포즈가 맞지 않음.";
      }

      // 다음 라운드를 위해 상태 리셋
      countdownStarted = false;
      poseMatched = false;
    }
  }, 1000);
}

// 벽모양 변경
function changeWallPose() {
  const currentIndex = wallPoses.indexOf(currentWallPose);
  const nextIndex = (currentIndex + 1) % wallPoses.length;
  currentWallPose = wallPoses[nextIndex];
  
  // 3초 후 다음 라운드 시작
  setTimeout(() => {
    countdownStarted = false;
    statusBox.textContent = `다음 포즈: ${currentWallPose.name}`;
  }, 3000);
}

// 초기화 및 시작
async function initialize() {
  console.log("🚀 애플리케이션 초기화 시작");
  statusBox.textContent = "🚀 애플리케이션 초기화 중...";
  
  try {
    // 1. 벽모양 포즈 먼저 초기화
    initializeWallPose();
    
    // 2. Pose 초기화
    const poseInitialized = await initializePose();
    if (poseInitialized) {
      // 3. 카메라 시작
      await startCamera();
      console.log("✅ 애플리케이션 초기화 완료");
    } else {
      console.error("❌ 애플리케이션 초기화 실패");
      statusBox.textContent = "❌ 애플리케이션 초기화 실패";
    }
  } catch (error) {
    console.error("초기화 에러:", error);
    statusBox.textContent = "❌ 초기화 중 에러가 발생했습니다.";
  }
}

// 스크립트 시작 시 초기화 실행
if (typeof window !== 'undefined') {
  window.addEventListener('load', initialize);
}
