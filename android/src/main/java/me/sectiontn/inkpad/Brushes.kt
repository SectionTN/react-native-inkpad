package me.sectiontn.inkpad

import androidx.ink.brush.Brush
import androidx.ink.brush.StockBrushes

internal object Brushes {
  private const val EPSILON = 0.1f
  private const val MIN_SIZE = 0.5f
  private const val MAX_SIZE = 200f

  fun create(type: BrushType, color: Int, size: Float): Brush {
    val family = when (type) {
      BrushType.PEN -> StockBrushes.pressurePen()
      BrushType.MARKER -> StockBrushes.marker()
      BrushType.HIGHLIGHTER -> StockBrushes.highlighter()
    }
    val inkColor = if (type == BrushType.HIGHLIGHTER) ColorHex.highlighterArgb(color) else color
    return Brush.createWithColorIntArgb(family, inkColor, size.coerceIn(MIN_SIZE, MAX_SIZE), EPSILON)
  }
}
