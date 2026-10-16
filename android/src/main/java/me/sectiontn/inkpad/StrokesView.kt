package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer

internal class StrokesView(context: Context) : View(context) {
  private val renderer = CanvasStrokeRenderer.create()
  private val canvasToScreen = Matrix()
  private val imagePaint = Paint(Paint.FILTER_BITMAP_FLAG)
  private val imageRect = RectF()

  var strokes: List<InkpadStroke> = emptyList()
  var canvasColor: Int = Color.TRANSPARENT
  var backgroundImage: Bitmap? = null
  var backgroundFit = BackgroundFit.CONTAIN

  override fun onDraw(canvas: Canvas) {
    if (Color.alpha(canvasColor) > 0) canvas.drawColor(canvasColor)
    backgroundImage?.let { drawImage(canvas, it) }
    val density = resources.displayMetrics.density
    canvasToScreen.setScale(density, density)
    // The renderer reads the matrix only for quality, so the canvas needs the same transform.
    val saved = canvas.save()
    canvas.concat(canvasToScreen)
    for (item in strokes) renderer.draw(canvas, item.stroke, canvasToScreen)
    canvas.restoreToCount(saved)
  }

  private fun drawImage(canvas: Canvas, image: Bitmap) {
    val rect = Fit.rect(image.width.toFloat(), image.height.toFloat(), width.toFloat(), height.toFloat(), backgroundFit)
    imageRect.set(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height)
    val saved = canvas.save()
    canvas.clipRect(0f, 0f, width.toFloat(), height.toFloat())
    canvas.drawBitmap(image, null, imageRect, imagePaint)
    canvas.restoreToCount(saved)
  }
}
