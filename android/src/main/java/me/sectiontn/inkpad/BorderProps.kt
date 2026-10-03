package me.sectiontn.inkpad

import android.view.View
import com.facebook.react.bridge.ColorPropConverter
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.LengthPercentage
import com.facebook.react.uimanager.Spacing
import com.facebook.react.uimanager.ViewProps
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.BorderStyle
import com.facebook.react.uimanager.style.LogicalEdge

// RN draws borders only for its own views, so the canvas applies them with the same helper.
internal object BorderProps {
  // Same order as LogicalEdge.
  private val WIDTHS = listOf(
    ViewProps.BORDER_WIDTH,
    ViewProps.BORDER_LEFT_WIDTH,
    ViewProps.BORDER_RIGHT_WIDTH,
    ViewProps.BORDER_TOP_WIDTH,
    ViewProps.BORDER_BOTTOM_WIDTH,
    ViewProps.BORDER_START_WIDTH,
    ViewProps.BORDER_END_WIDTH,
  )

  private val COLORS = mapOf(
    ViewProps.BORDER_COLOR to Spacing.ALL,
    ViewProps.BORDER_LEFT_COLOR to Spacing.LEFT,
    ViewProps.BORDER_RIGHT_COLOR to Spacing.RIGHT,
    ViewProps.BORDER_TOP_COLOR to Spacing.TOP,
    ViewProps.BORDER_BOTTOM_COLOR to Spacing.BOTTOM,
    ViewProps.BORDER_START_COLOR to Spacing.START,
    ViewProps.BORDER_END_COLOR to Spacing.END,
    ViewProps.BORDER_BLOCK_COLOR to Spacing.BLOCK,
    ViewProps.BORDER_BLOCK_END_COLOR to Spacing.BLOCK_END,
    ViewProps.BORDER_BLOCK_START_COLOR to Spacing.BLOCK_START,
  )

  // Same order as BorderRadiusProp.
  private val RADII = listOf(
    ViewProps.BORDER_RADIUS,
    ViewProps.BORDER_TOP_LEFT_RADIUS,
    ViewProps.BORDER_TOP_RIGHT_RADIUS,
    ViewProps.BORDER_BOTTOM_RIGHT_RADIUS,
    ViewProps.BORDER_BOTTOM_LEFT_RADIUS,
    ViewProps.BORDER_TOP_START_RADIUS,
    ViewProps.BORDER_TOP_END_RADIUS,
    ViewProps.BORDER_BOTTOM_START_RADIUS,
    ViewProps.BORDER_BOTTOM_END_RADIUS,
    ViewProps.BORDER_END_END_RADIUS,
    ViewProps.BORDER_END_START_RADIUS,
    ViewProps.BORDER_START_END_RADIUS,
    ViewProps.BORDER_START_START_RADIUS,
  )

  /** Applies a border prop and returns true, or returns false for any other prop. */
  fun apply(view: View, name: String, value: Any?): Boolean {
    val width = WIDTHS.indexOf(name)
    if (width >= 0) {
      BackgroundStyleApplicator.setBorderWidth(view, LogicalEdge.values()[width], (value as Double?)?.toFloat())
      return true
    }
    COLORS[name]?.let { spacing ->
      val color = value?.let { ColorPropConverter.getColor(it, view.context) }
      BackgroundStyleApplicator.setBorderColor(view, LogicalEdge.fromSpacingType(spacing), color)
      return true
    }
    val radius = RADII.indexOf(name)
    if (radius >= 0) {
      val length = LengthPercentage.setFromDynamic(DynamicFromObject(value))
      BackgroundStyleApplicator.setBorderRadius(view, BorderRadiusProp.values()[radius], length)
      return true
    }
    if (name == "borderStyle") {
      BackgroundStyleApplicator.setBorderStyle(view, (value as String?)?.let(BorderStyle::fromString))
      return true
    }
    return false
  }
}
