package com.attendx

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.media.ExifInterface
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.sqrt

class FaceRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var tfliteInterpreter: Interpreter? = null
    private val MODEL_FILE = "mobilefacenet.tflite"
    private val INPUT_SIZE = 112
    private val EMBEDDING_SIZE = 192

    override fun getName(): String {
        return "FaceRecognitionModule"
    }

    @Synchronized
    private fun getInterpreter(): Interpreter? {
        if (tfliteInterpreter == null) {
            try {
                val assetManager = reactContext.assets
                val fileDescriptor = assetManager.openFd(MODEL_FILE)
                val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
                val fileChannel = inputStream.channel
                val startOffset = fileDescriptor.startOffset
                val declaredLength = fileDescriptor.declaredLength
                val mappedByteBuffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)

                val options = Interpreter.Options()
                options.setNumThreads(4)
                tfliteInterpreter = Interpreter(mappedByteBuffer, options)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return tfliteInterpreter
    }

    @ReactMethod
    fun processImageForFace(imagePath: String, promise: Promise) {
        try {
            var bitmap: Bitmap? = null
            var cleanPath = imagePath

            if (cleanPath.startsWith("content://")) {
                try {
                    val uri = android.net.Uri.parse(cleanPath)
                    val inputStream = reactContext.contentResolver.openInputStream(uri)
                    bitmap = BitmapFactory.decodeStream(inputStream)
                    inputStream?.close()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            } else {
                if (cleanPath.startsWith("file://")) {
                    cleanPath = cleanPath.substring(7)
                }
                val file = File(cleanPath)
                if (!file.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Image file does not exist at path: $cleanPath")
                    return
                }
                bitmap = BitmapFactory.decodeFile(cleanPath)
                if (bitmap != null) {
                    bitmap = rotateBitmapIfRequired(bitmap, cleanPath)
                }
            }

            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image from path: $imagePath")
                return
            }

            // ML Kit Face Detector setup
            val highAccuracyOpts = FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
                .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
                .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
                .build()

            val detector = FaceDetection.getClient(highAccuracyOpts)
            val image = InputImage.fromBitmap(bitmap, 0)

            detector.process(image)
                .addOnSuccessListener { faces ->
                    if (faces.size == 0) {
                        val result = Arguments.createMap()
                        result.putBoolean("success", false)
                        result.putString("error", "NO_FACE")
                        result.putString("message", "Face not detected. Please position your face inside the frame.")
                        promise.resolve(result)
                        return@addOnSuccessListener
                    }

                    if (faces.size > 1) {
                        val result = Arguments.createMap()
                        result.putBoolean("success", false)
                        result.putString("error", "MULTIPLE_FACES")
                        result.putString("message", "Only one face should be visible.")
                        promise.resolve(result)
                        return@addOnSuccessListener
                    }

                    val face = faces[0]
                    val boundingBox = face.boundingBox

                    // Crop and align face bitmap with padding
                    val croppedFaceBitmap = cropFaceBitmap(bitmap, boundingBox)
                    val resizedFaceBitmap = Bitmap.createScaledBitmap(croppedFaceBitmap, INPUT_SIZE, INPUT_SIZE, true)

                    // Run TFLite MobileFaceNet model
                    val embedding = runMobileFaceNetInference(resizedFaceBitmap)

                    val embeddingArray = Arguments.createArray()
                    for (value in embedding) {
                        embeddingArray.pushDouble(value.toDouble())
                    }

                    val result = Arguments.createMap()
                    result.putBoolean("success", true)
                    result.putInt("faceCount", 1)
                    result.putArray("embedding", embeddingArray)
                    result.putInt("embeddingDim", embedding.size)
                    promise.resolve(result)
                }
                .addOnFailureListener { e ->
                    promise.reject("DETECTION_FAILED", "Face detection failed: ${e.message}", e)
                }

        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", "Error processing face image: ${e.message}", e)
        }
    }

    @ReactMethod
    fun compareEmbeddings(embedding1: ReadableArray, embedding2: ReadableArray, threshold: Double, promise: Promise) {
        try {
            if (embedding1.size() != embedding2.size()) {
                promise.reject("DIM_MISMATCH", "Embedding dimensions do not match: ${embedding1.size()} vs ${embedding2.size()}")
                return
            }

            var dotProduct = 0.0
            var normA = 0.0
            var normB = 0.0

            for (i in 0 until embedding1.size()) {
                val a = embedding1.getDouble(i)
                val b = embedding2.getDouble(i)
                dotProduct += a * b
                normA += a * a
                normB += b * b
            }

            val similarity = if (normA > 0 && normB > 0) dotProduct / (sqrt(normA) * sqrt(normB)) else 0.0
            val isMatch = similarity >= threshold

            val result = Arguments.createMap()
            result.putDouble("similarityScore", similarity)
            result.putBoolean("isMatch", isMatch)
            result.putDouble("threshold", threshold)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("COMPARE_ERROR", "Error comparing embeddings: ${e.message}", e)
        }
    }

    private fun runMobileFaceNetInference(bitmap: Bitmap): FloatArray {
        val interpreter = getInterpreter() ?: throw IllegalStateException("TFLite interpreter not initialized")

        // Input tensor buffer [1, 112, 112, 3] float32
        val inputBuffer = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * 4)
        inputBuffer.order(ByteOrder.nativeOrder())
        inputBuffer.rewind()

        val intValues = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(intValues, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        for (pixelValue in intValues) {
            val r = ((pixelValue shr 16 and 0xFF) - 127.5f) / 128.0f
            val g = ((pixelValue shr 8 and 0xFF) - 127.5f) / 128.0f
            val b = ((pixelValue and 0xFF) - 127.5f) / 128.0f

            inputBuffer.putFloat(r)
            inputBuffer.putFloat(g)
            inputBuffer.putFloat(b)
        }

        // Output array [1, 192]
        val outputEmbedding = Array(1) { FloatArray(EMBEDDING_SIZE) }
        interpreter.run(inputBuffer, outputEmbedding)

        // L2 Normalization
        val rawEmbedding = outputEmbedding[0]
        var norm = 0.0f
        for (v in rawEmbedding) {
            norm += v * v
        }
        norm = sqrt(norm)

        if (norm > 0) {
            for (i in rawEmbedding.indices) {
                rawEmbedding[i] = rawEmbedding[i] / norm
            }
        }

        return rawEmbedding
    }

    private fun cropFaceBitmap(bitmap: Bitmap, rect: Rect): Bitmap {
        val width = bitmap.width
        val height = bitmap.height

        // Add 15% padding around bounding box
        val paddingX = (rect.width() * 0.15f).toInt()
        val paddingY = (rect.height() * 0.15f).toInt()

        val left = (rect.left - paddingX).coerceAtLeast(0)
        val top = (rect.top - paddingY).coerceAtLeast(0)
        val right = (rect.right + paddingX).coerceAtMost(width)
        val bottom = (rect.bottom + paddingY).coerceAtMost(height)

        val cropW = (right - left).coerceAtLeast(1)
        val cropH = (bottom - top).coerceAtLeast(1)

        return Bitmap.createBitmap(bitmap, left, top, cropW, cropH)
    }

    private fun rotateBitmapIfRequired(bitmap: Bitmap, path: String): Bitmap {
        try {
            val exif = ExifInterface(path)
            val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                else -> return bitmap
            }
            return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        } catch (e: Exception) {
            return bitmap
        }
    }
}
