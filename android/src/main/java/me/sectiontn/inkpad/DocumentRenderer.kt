package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color

internal object DocumentRenderer {
  fun render(context: Context, documentJson: String, optionsJson: String, done: (Result<String>) -> Unit) {
    InkpadExecutors.renderer.execute { done(runCatching { draw(context, documentJson, optionsJson) }) }
  }

  private fun draw(context: Context, documentJson: String, optionsJson: String): String {
    val options = ExportOptions.parse(optionsJson)
    val image = options.backgroundImageUri?.takeIf { it.isNotEmpty() }?.let { load(context, it) }
    try {
      val doc = DocumentJson.parse(documentJson)
      val metrics = context.resources.displayMetrics
      val unitLengthCm = InkConverter.strokeUnitLengthCm(metrics.density, metrics.xdpi, metrics.ydpi)
      val strokes = doc.strokes.map { InkConverter.toInk(it, unitLengthCm) }
      val color = options.backgroundColor ?: Color.TRANSPARENT
      val fit = options.backgroundFit ?: BackgroundFit.CONTAIN
      return ImageExporter.export(context, strokes, doc.width, doc.height, color, image, fit, options)
    } finally {
      image?.recycle()
    }
  }

  private fun load(context: Context, uri: String): Bitmap =
    runCatching { BackgroundLoader.load(context, uri) }.getOrElse { error ->
      throw error as? InkpadException
        ?: InkpadException(
          ErrorCodes.IMAGE_LOAD,
          "could not load the background image $uri: ${error.message ?: error.javaClass.simpleName}",
        )
    }
}
