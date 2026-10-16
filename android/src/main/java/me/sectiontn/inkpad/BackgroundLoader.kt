package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.util.Base64
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.nio.ByteBuffer

internal enum class SourceKind { HTTP, FILE, DATA, CONTENT, ASSET, RESOURCE }

internal object BackgroundLoader {
  private const val MAX_SIDE = 4096
  private const val TIMEOUT_MS = 15_000
  private val SCHEME = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*:")

  fun kindOf(uri: String): SourceKind? = when {
    uri.isEmpty() -> null
    uri.startsWith("http://") || uri.startsWith("https://") -> SourceKind.HTTP
    uri.startsWith("file:///android_asset/") || uri.startsWith("asset:/") -> SourceKind.ASSET
    uri.startsWith("file:") -> SourceKind.FILE
    uri.startsWith("data:") -> SourceKind.DATA
    uri.startsWith("content:") || uri.startsWith("android.resource:") -> SourceKind.CONTENT
    SCHEME.containsMatchIn(uri) -> null
    else -> SourceKind.RESOURCE
  }

  fun sampleSize(width: Int, height: Int): Int {
    var sample = 1
    while (maxOf(width, height) / sample > MAX_SIDE) sample *= 2
    return sample
  }

  fun load(context: Context, uri: String): Bitmap {
    val kind = kindOf(uri) ?: fail(uri, "unsupported URI")
    val bytes = try {
      read(context, uri, kind)
    } catch (e: IOException) {
      fail(uri, e.message ?: e.javaClass.simpleName)
    }
    return decode(bytes) ?: fail(uri, "the data is not an image")
  }

  private fun read(context: Context, uri: String, kind: SourceKind): ByteArray = when (kind) {
    SourceKind.HTTP -> readHttp(uri)
    SourceKind.FILE, SourceKind.CONTENT ->
      context.contentResolver.openInputStream(Uri.parse(uri)).use { it?.readBytes() } ?: throw IOException("no data")
    SourceKind.ASSET -> context.assets.open(uri.substringAfter("android_asset/").removePrefix("asset:").trimStart('/')).use(InputStream::readBytes)
    SourceKind.DATA -> readData(uri)
    SourceKind.RESOURCE -> readResource(context, uri)
  }

  private fun readHttp(uri: String): ByteArray {
    val connection = URL(uri).openConnection() as HttpURLConnection
    try {
      connection.connectTimeout = TIMEOUT_MS
      connection.readTimeout = TIMEOUT_MS
      val code = connection.responseCode
      if (code !in 200..299) throw IOException("HTTP $code")
      return connection.inputStream.use(InputStream::readBytes)
    } finally {
      connection.disconnect()
    }
  }

  private fun readData(uri: String): ByteArray {
    val comma = uri.indexOf(',')
    if (comma < 0) throw IOException("malformed data URI")
    val data = uri.substring(comma + 1)
    return try {
      if (uri.substring(0, comma).endsWith(";base64")) Base64.decode(data, Base64.DEFAULT)
      else URLDecoder.decode(data, "UTF-8").toByteArray()
    } catch (e: IllegalArgumentException) {
      throw IOException("malformed data URI")
    }
  }

  // Release builds bundle require()d images as drawables named after their path.
  private fun readResource(context: Context, name: String): ByteArray {
    val resources = context.resources
    val id = resources.getIdentifier(name, "drawable", context.packageName)
      .takeIf { it != 0 } ?: resources.getIdentifier(name, "raw", context.packageName)
    if (id == 0) throw IOException("no drawable or raw resource named $name")
    return resources.openRawResource(id).use(InputStream::readBytes)
  }

  private fun decode(bytes: ByteArray): Bitmap? = try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) decodeWithImageDecoder(bytes) else decodeWithBitmapFactory(bytes)
  } catch (e: IOException) {
    null
  }

  private fun decodeWithImageDecoder(bytes: ByteArray): Bitmap =
    ImageDecoder.decodeBitmap(ImageDecoder.createSource(ByteBuffer.wrap(bytes))) { decoder, info, _ ->
      decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
      decoder.setTargetSampleSize(sampleSize(info.size.width, info.size.height))
    }

  private fun decodeWithBitmapFactory(bytes: ByteArray): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val options = BitmapFactory.Options().apply {
      inSampleSize = sampleSize(bounds.outWidth, bounds.outHeight)
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: return null
    val orientation = runCatching {
      ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)
    val matrix = orientationMatrix(orientation) ?: return bitmap
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun orientationMatrix(orientation: Int): Matrix? = when (orientation) {
    ExifInterface.ORIENTATION_ROTATE_90 -> Matrix().apply { postRotate(90f) }
    ExifInterface.ORIENTATION_ROTATE_180 -> Matrix().apply { postRotate(180f) }
    ExifInterface.ORIENTATION_ROTATE_270 -> Matrix().apply { postRotate(270f) }
    ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> Matrix().apply { postScale(-1f, 1f) }
    ExifInterface.ORIENTATION_FLIP_VERTICAL -> Matrix().apply { postScale(1f, -1f) }
    ExifInterface.ORIENTATION_TRANSPOSE -> Matrix().apply { postRotate(90f); postScale(-1f, 1f) }
    ExifInterface.ORIENTATION_TRANSVERSE -> Matrix().apply { postRotate(270f); postScale(-1f, 1f) }
    else -> null
  }

  private fun fail(uri: String, reason: String): Nothing =
    throw InkpadException(ErrorCodes.IMAGE_LOAD, "could not load the background image $uri: $reason")
}
