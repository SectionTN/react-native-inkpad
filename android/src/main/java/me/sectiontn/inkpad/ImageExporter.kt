package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.net.Uri
import android.util.Base64
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
import kotlin.math.roundToInt

internal object ImageExporter {
  private val renderer by lazy { CanvasStrokeRenderer.create() }

  fun export(
    context: Context,
    strokes: List<InkpadStroke>,
    width: Float,
    height: Float,
    canvasColor: Int,
    options: ExportOptions,
  ): String {
    var left = 0f
    var top = 0f
    var areaWidth = width
    var areaHeight = height
    if (options.trim) {
      val boxes = strokes.mapNotNull { it.stroke.shape.computeBoundingBox() }
      if (boxes.isEmpty()) throw InkpadException(ErrorCodes.EMPTY, "nothing to trim: the canvas is empty")
      left = boxes.minOf { it.xMin } - options.padding
      top = boxes.minOf { it.yMin } - options.padding
      areaWidth = boxes.maxOf { it.xMax } + options.padding - left
      areaHeight = boxes.maxOf { it.yMax } + options.padding - top
    }
    val pixelWidth = options.pixels(areaWidth)
    val pixelHeight = options.pixels(areaHeight)
    val bitmap = Bitmap.createBitmap(pixelWidth, pixelHeight, Bitmap.Config.ARGB_8888)
    try {
      val canvas = Canvas(bitmap)
      if (options.jpeg) canvas.drawColor(Color.WHITE)
      if (options.background && Color.alpha(canvasColor) > 0) canvas.drawColor(canvasColor)
      val transform = Matrix().apply {
        setScale(options.scale, options.scale)
        preTranslate(-left, -top)
      }
      for (item in strokes) renderer.draw(canvas, item.stroke, transform)
      val bytes = ByteArrayOutputStream().use { out ->
        val format = if (options.jpeg) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
        bitmap.compress(format, (options.quality * 100).roundToInt(), out)
        out.toByteArray()
      }
      val file = File(context.cacheDir, "inkpad-${UUID.randomUUID()}.${if (options.jpeg) "jpg" else "png"}")
      file.writeBytes(bytes)
      val result = JSONObject()
        .put("uri", Uri.fromFile(file).toString())
        .put("width", pixelWidth)
        .put("height", pixelHeight)
      if (options.base64) result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
      return result.toString()
    } finally {
      bitmap.recycle()
    }
  }
}
