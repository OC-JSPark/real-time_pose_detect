const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusBox = document.getElementById("status");

let lastResult = "fail";
let poseMatched = false;

let timer = 5;
let countdownStarted = false;
let pose;
// Mediapipe Pose 초기화
// const pose = new Pose.Pose({
//   locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
// });

if (typeof Pose !== "undefined") {
    const pose = new Pose.Pose({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    // pose.setOptions(...) 이하 계속
  } else {
    console.error("❌ Mediapipe Pose 로딩 실패. HTML에 pose.js가 포함되었는지 확인하세요.");
  }


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

    const keypoints = results.poseLandmarks.map(lm => ({ x: lm.x, y: lm.y }));

    // 타이머 시작
    if (!countdownStarted) {
      countdownStarted = true;
      startCountdown();
    }

    // 서버로 포즈 비교 요청
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
  }
  ctx.restore();
});

// ✅ 명시적 웹캠 권한 요청 및 연결
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

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

      // 다음 라운드를 위해 리셋
      countdownStarted = false;
      poseMatched = false;
    }
  }, 1000);
}

// ✅ 실행 시작
startCamera();
