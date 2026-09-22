/**
 * Configuration for On-Device MobileFaceNet Face Recognition
 */
export const FACE_RECOGNITION_CONFIG = {
  MODEL_NAME: 'MobileFaceNet',
  MODEL_FILE: 'mobilefacenet.tflite',
  INPUT_SIZE: 112,
  EMBEDDING_DIM: 192,
  
  /**
   * Similarity threshold for matching faces using Cosine Similarity on L2-normalized vectors.
   * Standard threshold range for MobileFaceNet is 0.60 - 0.70.
   * 0.65 provides a robust balance between true acceptance rate and false acceptance prevention.
   */
  SIMILARITY_THRESHOLD: 0.65,
  
  THRESHOLD_RATIONALE:
    'MobileFaceNet outputs 192-dim L2-normalized feature vectors. A cosine similarity threshold of 0.65 calibrates for high security while accommodating minor variations in facial angle and ambient lighting.'
};
