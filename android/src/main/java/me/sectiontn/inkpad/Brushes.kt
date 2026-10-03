package me.sectiontn.inkpad

import androidx.ink.brush.Brush
import androidx.ink.brush.BrushBehavior
import androidx.ink.brush.BrushCoat
import androidx.ink.brush.BrushFamily
import androidx.ink.brush.EasingFunction
import androidx.ink.brush.ExperimentalInkCustomBrushApi
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes

internal object Brushes {
  private const val EPSILON = 0.1f
  private const val MIN_SIZE = 0.5f
  private const val MAX_SIZE = 200f
  private const val FAST_CM_PER_SECOND = 30f
  private const val FAST_SIZE_RATIO = 0.3f
  private const val SPEED_SMOOTHING_MILLIS = 40L

  // Touch screens rarely report real pressure, so finger and mouse strokes thin with speed instead.
  @OptIn(ExperimentalInkCustomBrushApi::class)
  private val pen: BrushFamily by lazy {
    val stock = StockBrushes.pressurePen()
    val thinning = BrushBehavior.Builder()
      .setSource(BrushBehavior.Source.INPUT_SPEED_IN_CENTIMETERS_PER_SECOND)
      .setSourceValueRangeStart(0f)
      .setSourceValueRangeEnd(FAST_CM_PER_SECOND)
      .setTarget(BrushBehavior.Target.SIZE_MULTIPLIER)
      .setTargetModifierRangeStart(1f)
      .setTargetModifierRangeEnd(FAST_SIZE_RATIO)
      .setResponseCurve(EasingFunction.Predefined.EASE_OUT)
      .setResponseTimeMillis(SPEED_SMOOTHING_MILLIS)
      .setEnabledToolTypes(setOf(InputToolType.TOUCH, InputToolType.MOUSE))
      .build()
    val coats = stock.coats.map { coat ->
      val tip = coat.tip.toBuilder().setBehaviors(coat.tip.behaviors + thinning).build()
      BrushCoat(tip, coat.paintPreferences)
    }
    BrushFamily(coats, "inkpad-pen", stock.inputModel)
  }

  fun create(type: BrushType, color: Int, size: Float): Brush {
    val family = when (type) {
      BrushType.PEN -> pen
      BrushType.MARKER -> StockBrushes.marker()
      BrushType.HIGHLIGHTER -> StockBrushes.highlighter()
    }
    val inkColor = if (type == BrushType.HIGHLIGHTER) ColorHex.highlighterArgb(color) else color
    return Brush.createWithColorIntArgb(family, inkColor, size.coerceIn(MIN_SIZE, MAX_SIZE), EPSILON)
  }
}
