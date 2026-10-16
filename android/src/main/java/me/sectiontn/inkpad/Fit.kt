package me.sectiontn.inkpad

internal data class FitRect(val x: Float, val y: Float, val width: Float, val height: Float)

internal object Fit {
  fun rect(imageWidth: Float, imageHeight: Float, boxWidth: Float, boxHeight: Float, fit: BackgroundFit): FitRect {
    val sx = if (imageWidth > 0f) boxWidth / imageWidth else 0f
    val sy = if (imageHeight > 0f) boxHeight / imageHeight else 0f
    val scale = if (fit == BackgroundFit.COVER) maxOf(sx, sy) else minOf(sx, sy)
    val width = imageWidth * scale
    val height = imageHeight * scale
    return FitRect((boxWidth - width) / 2f, (boxHeight - height) / 2f, width, height)
  }
}
