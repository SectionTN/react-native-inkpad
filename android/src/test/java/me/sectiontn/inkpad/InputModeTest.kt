package me.sectiontn.inkpad

import android.view.MotionEvent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InputModeTest {
  @Test
  fun anyModeTakesEveryTool() {
    for (tool in listOf(MotionEvent.TOOL_TYPE_FINGER, MotionEvent.TOOL_TYPE_MOUSE, MotionEvent.TOOL_TYPE_STYLUS)) {
      assertTrue(InputMode.ANY.accepts(tool))
    }
  }

  @Test
  fun stylusModeTakesOnlyPenTips() {
    assertTrue(InputMode.STYLUS.accepts(MotionEvent.TOOL_TYPE_STYLUS))
    assertTrue(InputMode.STYLUS.accepts(MotionEvent.TOOL_TYPE_ERASER))
    assertFalse(InputMode.STYLUS.accepts(MotionEvent.TOOL_TYPE_FINGER))
    assertFalse(InputMode.STYLUS.accepts(MotionEvent.TOOL_TYPE_MOUSE))
    assertFalse(InputMode.STYLUS.accepts(MotionEvent.TOOL_TYPE_UNKNOWN))
  }
}
