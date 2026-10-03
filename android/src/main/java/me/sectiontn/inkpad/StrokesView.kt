package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.view.View
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer

internal class StrokesView(context: Context) : View(context) {
  private val renderer = CanvasStrokeRenderer.create()
  private val canvasToScreen = Matrix()

  var strokes: List<InkpadStroke> = emptyList()
  var canvasColor: Int = Color.TRANSPARENT

  override fun onDraw(canvas: Canvas) {
    if (Color.alpha(canvasColor) > 0) canvas.drawColor(canvasColor)
    val density = resources.displayMetrics.density
    canvasToScreen.setScale(density, density)
    // The renderer reads the matrix only for quality, so the canvas needs the same transform.
    val saved = canvas.save()
    canvas.concat(canvasToScreen)
    for (item in strokes) renderer.draw(canvas, item.stroke, canvasToScreen)
    canvas.restoreToCount(saved)
  }
}
