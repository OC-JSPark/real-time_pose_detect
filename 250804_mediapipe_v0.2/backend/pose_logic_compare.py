from scipy.spatial.distance import cosine
import numpy as np

# 예시 기준 포즈 (33개 keypoint x, y의 flattened 형태)
reference_pose = np.array([0.5, 0.5] * 33)  # 실제 기준 포즈로 교체 가능

def compare_pose(input_keypoints, threshold=0.15):
    if not input_keypoints or len(input_keypoints) != 33:
        return "fail"
    
    # input_keypoints: [{x: .., y: ..}, ...] 형태
    input_vec = np.array([coord for pt in input_keypoints for coord in (pt["x"], pt["y"])])

    similarity = 1 - cosine(reference_pose, input_vec)
    print(f"Similarity: {similarity:.4f}")
    
    return "pass" if similarity > (1 - threshold) else "fail"
