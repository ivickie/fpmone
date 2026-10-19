package org.fpm.one.core.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import java.io.ByteArrayOutputStream
import kotlin.math.max

object ImageOptimizer {
    private const val TAG = "ImageOptimizer"
    private const val SIZE_THRESHOLD_BYTES = 1024 * 1024 // 1 MB
    private const val MAX_DIMENSION = 2048
    private const val JPEG_QUALITY = 85

    /**
     * Reads image bytes from [uri], downsampling and compressing if file size > 1 MB.
     * Preserves EXIF orientation so rotated photos do not appear sideways or inverted.
     * Returns optimized ByteArray ready for upload.
     */
    fun optimize(context: Context, uri: Uri): ByteArray {
        val originalBytes = try {
            context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read input stream from URI: $uri", e)
            null
        } ?: return ByteArray(0)

        val originalSize = originalBytes.size
        if (originalSize <= SIZE_THRESHOLD_BYTES) {
            Log.d(TAG, "Image size ($originalSize bytes) is within 1MB limit. Skipping compression.")
            return originalBytes
        }

        Log.d(TAG, "Image size exceeds 1MB ($originalSize bytes). Optimizing image...")

        return try {
            // Check EXIF orientation
            val exifOrientation = try {
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    val exif = ExifInterface(stream)
                    exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                } ?: ExifInterface.ORIENTATION_NORMAL
            } catch (e: Exception) {
                Log.w(TAG, "Could not determine EXIF orientation: ${e.message}")
                ExifInterface.ORIENTATION_NORMAL
            }

            // Decode dimensions only
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeByteArray(originalBytes, 0, originalBytes.size, options)
            val origWidth = options.outWidth
            val origHeight = options.outHeight

            // Calculate sample size
            var sampleSize = 1
            val maxDim = max(origWidth, origHeight)
            if (maxDim > MAX_DIMENSION) {
                sampleSize = 2
                while ((maxDim / sampleSize) > MAX_DIMENSION) {
                    sampleSize *= 2
                }
            }

            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }
            val sampledBitmap = BitmapFactory.decodeByteArray(originalBytes, 0, originalBytes.size, decodeOptions)
                ?: return originalBytes

            // Rotate/flip bitmap if necessary based on EXIF
            val matrix = Matrix()
            when (exifOrientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            }

            // Downscale precisely if still > MAX_DIMENSION
            val transformedBitmap = if (sampledBitmap.width > MAX_DIMENSION || sampledBitmap.height > MAX_DIMENSION) {
                val scale = MAX_DIMENSION.toFloat() / max(sampledBitmap.width, sampledBitmap.height).toFloat()
                matrix.postScale(scale, scale)
                Bitmap.createBitmap(sampledBitmap, 0, 0, sampledBitmap.width, sampledBitmap.height, matrix, true)
            } else if (!matrix.isIdentity) {
                Bitmap.createBitmap(sampledBitmap, 0, 0, sampledBitmap.width, sampledBitmap.height, matrix, true)
            } else {
                sampledBitmap
            }

            val outputStream = ByteArrayOutputStream()
            transformedBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, outputStream)
            val compressedBytes = outputStream.toByteArray()

            if (transformedBitmap != sampledBitmap) {
                transformedBitmap.recycle()
            }
            sampledBitmap.recycle()

            val reductionPercent = ((1 - compressedBytes.size.toDouble() / originalSize) * 100).toInt()
            Log.i(TAG, "Image optimized: original $originalSize bytes -> compressed ${compressedBytes.size} bytes ($reductionPercent% reduction)")
            compressedBytes
        } catch (e: Exception) {
            Log.e(TAG, "Error optimizing image: ${e.message}. Falling back to original bytes.", e)
            originalBytes
        }
    }
}
