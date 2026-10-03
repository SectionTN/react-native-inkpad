package me.sectiontn.inkpad

import org.json.JSONObject
import kotlin.math.roundToInt

internal class ExportOptions(
  val jpeg: Boolean,
  val quality: Float,
  val scale: Float,
  val trim: Boolean,
  val padding: Float,
  val background: Boolean,
  val base64: Boolean,
) {
  fun pixels(units: Float): Int = maxOf(1, (units * scale).roundToInt())

  companion object {
    fun parse(json: String?): ExportOptions {
      val o = runCatching { JSONObject(json ?: "{}") }.getOrDefault(JSONObject())
      val scale = o.optDouble("scale", 1.0).toFloat()
      return ExportOptions(
        jpeg = o.optString("format") == "jpeg",
        quality = o.optDouble("quality", 0.9).toFloat().coerceIn(0f, 1f),
        scale = if (scale > 0f) scale else 1f,
        trim = o.optBoolean("trim", false),
        padding = o.optDouble("padding", 0.0).toFloat().coerceAtLeast(0f),
        background = o.optBoolean("background", true),
        base64 = o.optBoolean("base64", false),
      )
    }
  }
}
