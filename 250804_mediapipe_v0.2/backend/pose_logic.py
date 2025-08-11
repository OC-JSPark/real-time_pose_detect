import mediapipe as mp
import cv2
import numpy as np

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

# 예시 타겟 포즈 (상체 일부만)
TARGET_POSE = {
    11: {"x": 0.5, "y": 0.4},  # left shoulder
    12: {"x": 0.5, "y": 0.4},  # right shoulder
    13: {"x": 0.45, "y": 0.6}, # left elbow
    14: {"x": 0.55, "y": 0.6}, # right elbow
}

def process_image_and_compare(image_bytes, threshold=0.1):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    results = pose.process(rgb)
    if not results.pose_landmarks:
        return "no_pose"

    landmarks = results.pose_landmarks.landmark
    user_pose = {
        i: {"x": lm.x, "y": lm.y}
        for i, lm in enumerate(landmarks)
    }

    match, total = 0, 0
    for idx, target in TARGET_POSE.items():
        if idx in user_pose:
            dx = abs(user_pose[idx]["x"] - target["x"])
            dy = abs(user_pose[idx]["y"] - target["y"])
            if dx < threshold and dy < threshold:
                match += 1
            total += 1

    return "pass" if total > 0 and (match / total) >= 0.8 else "fail"
