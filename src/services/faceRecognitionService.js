import { NativeModules } from 'react-native';
import { FACE_RECOGNITION_CONFIG } from '../config/faceRecognition';

const { FaceRecognitionModule } = NativeModules;

/**
 * Service providing on-device face detection and MobileFaceNet recognition
 */
export const faceRecognitionService = {
  /**
   * Process a captured image: detects face, crops/aligns face, and runs MobileFaceNet TFLite inference.
   * @param {string} imagePath - Local file path of captured selfie/photo
   * @returns {Promise<{success: boolean, faceCount?: number, embedding?: number[], embeddingDim?: number, error?: string, message?: string}>}
   */
  async processImageForFace(imagePath) {
    if (!FaceRecognitionModule) {
      throw new Error(
        'FaceRecognitionModule native module is not linked or unavailable on this platform.'
      );
    }
    return await FaceRecognitionModule.processImageForFace(imagePath);
  },

  /**
   * Compares two 192-dimensional face embeddings using Cosine Similarity.
   * @param {number[]} embedding1
   * @param {number[]} embedding2
   * @param {number} [threshold=FACE_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD]
   * @returns {Promise<{similarityScore: number, isMatch: boolean, threshold: number}>}
   */
  async compareEmbeddings(
    embedding1,
    embedding2,
    threshold = FACE_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
  ) {
    if (!FaceRecognitionModule) {
      throw new Error(
        'FaceRecognitionModule native module is not linked or unavailable on this platform.'
      );
    }
    return await FaceRecognitionModule.compareEmbeddings(
      embedding1,
      embedding2,
      threshold
    );
  },
};
