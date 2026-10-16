package me.sectiontn.inkpad

import androidx.ink.strokes.Stroke

internal enum class BrushType(val id: String) {
  PEN("pen"),
  MARKER("marker"),
  HIGHLIGHTER("highlighter");

  companion object {
    fun from(id: String?): BrushType? = entries.firstOrNull { it.id == id }
  }
}

internal enum class InputType(val id: String) {
  TOUCH("touch"),
  STYLUS("stylus"),
  MOUSE("mouse");

  companion object {
    fun from(id: String?): InputType? = entries.firstOrNull { it.id == id }
  }
}

// Ink keeps geometry; we keep what the user asked for, which the document stores.
internal class InkpadStroke(
  val stroke: Stroke,
  val type: BrushType,
  val color: Int,
  val size: Float,
  val input: InputType,
) {
  class Meta(val type: BrushType, val color: Int, val size: Float, val input: InputType)
}

internal enum class InputMode(val id: String) {
  ANY("any"),
  STYLUS("stylus");

  companion object {
    fun from(id: String?): InputMode? = entries.firstOrNull { it.id == id }
  }
}

internal enum class BackgroundFit(val id: String) {
  CONTAIN("contain"),
  COVER("cover");

  companion object {
    fun from(id: String?): BackgroundFit? = entries.firstOrNull { it.id == id }
  }
}
