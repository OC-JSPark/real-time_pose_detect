// script.js

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusBox = document.getElementById("status");

let pose;  // 전역 변수로 선언
let lastResult = "fail";
let poseMatched = false;

let timer = 5;
let countdownStarted = false;

// Mediapipe Pose 객체 초기화 및 설정
if (typeof Pose !== "undefined") {
  const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });
  

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(async (results) => {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
      drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", lineWidth: 2 });

      // Pose keypoints를 간단히 {x, y} 좌표 배열로 추출
      const keypoints = results.poseLandmarks.map(lm => ({ x: lm.x, y: lm.y }));

      // 타이머가 시작되지 않았다면 시작
      if (!countdownStarted) {
        countdownStarted = true;
        startCountdown();
      }

      // 백엔드에 포즈 keypoints 전송하여 비교 요청
      try {
        const res = await fetch("/compare_pose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keypoints })
        });
        const data = await res.json();

        lastResult = data.result;
        if (lastResult === "pass") {
          poseMatched = true;
        }
      } catch (err) {
        console.error("서버와 통신 실패:", err);
      }
    }

    ctx.restore();
  });

} else {
  console.error("❌ Mediapipe Pose 로딩 실패. HTML에 pose.js가 포함되었는지 확인하세요.");
  alert("Pose.js 로딩 실패! 인터넷 연결 및 HTML 스크립트 포함을 확인하세요.");
}

// 웹캠 접근 및 Mediapipe와 연결하는 함수
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    if (!pose) {
      alert("Pose 객체가 초기화되지 않았습니다.");
      return;
    }

    const camera = new Camera.Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: 480,
      height: 360
    });

    camera.start();
    console.log("✅ 카메라 연결 성공");
  } catch (err) {
    console.error("❌ 카메라 연결 실패:", err);
    alert("카메라 접근이 차단되었습니다. 브라우저 권한을 확인해주세요.");
  }
}

// 5초 타이머 함수: 타이머 동작, 결과 출력, 상태 리셋
function startCountdown() {
  timer = 5;
  poseMatched = false;
  statusBox.textContent = `⏱️ 5초 안에 포즈 맞추기!`;

  const interval = setInterval(() => {
    timer -= 1;
    statusBox.textContent = `⏱️ 남은 시간: ${timer}초`;

    if (timer <= 0) {
      clearInterval(interval);

      if (poseMatched) {
        statusBox.textContent = "✅ 성공! 통과!";
      } else {
        statusBox.textContent = "❌ 실패! 포즈가 맞지 않음.";
      }

      // 다음 라운드를 위해 상태 리셋
      countdownStarted = false;
      poseMatched = false;
    }
  }, 1000);
}

// 스크립트 시작 시 웹캠과 Mediapipe 연결 시작
startCamera();
