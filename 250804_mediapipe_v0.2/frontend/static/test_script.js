// test_script.js - MediaPipe Pose 테스트 파일

// 테스트 함수들
function testPoseInitialization() {
  console.log("🧪 테스트: Pose 초기화");
  try {
    if (typeof Pose !== "undefined") {
      console.log("✅ Pose 객체 사용 가능");
      return true;
    } else {
      console.log("❌ Pose 객체 사용 불가");
      return false;
    }
  } catch (error) {
    console.log("❌ Pose 초기화 에러:", error);
    return false;
  }
}

function testCanvasRendering() {
  console.log("🧪 테스트: Canvas 렌더링");
  try {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    if (canvas && ctx) {
      console.log("✅ Canvas 렌더링 가능");
      return true;
    } else {
      console.log("❌ Canvas 렌더링 불가");
      return false;
    }
  } catch (error) {
    console.log("❌ Canvas 렌더링 에러:", error);
    return false;
  }
}

function testVideoStream() {
  console.log("🧪 테스트: 비디오 스트림");
  return new Promise((resolve) => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        console.log("✅ 비디오 스트림 접근 가능");
        resolve(true);
      })
      .catch(error => {
        console.log("❌ 비디오 스트림 접근 불가:", error);
        resolve(false);
      });
  });
}

function testPoseDetection() {
  console.log("🧪 테스트: 포즈 감지");
  // 실제 포즈 감지가 작동하는지 확인하는 로직
  return new Promise((resolve) => {
    setTimeout(() => {
      const poseDetected = document.querySelector('.pose-detected') !== null;
      if (poseDetected) {
        console.log("✅ 포즈 감지 작동");
        resolve(true);
      } else {
        console.log("❌ 포즈 감지 작동 안함");
        resolve(false);
      }
    }, 3000);
  });
}

// 전체 테스트 실행
async function runAllTests() {
  console.log("🚀 전체 테스트 시작");
  
  const test1 = testPoseInitialization();
  const test2 = testCanvasRendering();
  const test3 = await testVideoStream();
  const test4 = await testPoseDetection();
  
  const results = [test1, test2, test3, test4];
  const passed = results.filter(result => result).length;
  
  console.log(`📊 테스트 결과: ${passed}/${results.length} 통과`);
  
  if (passed === results.length) {
    console.log("🎉 모든 테스트 통과!");
  } else {
    console.log("⚠️ 일부 테스트 실패");
  }
}

// 페이지 로드 시 테스트 실행
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(runAllTests, 1000);
  });
} 