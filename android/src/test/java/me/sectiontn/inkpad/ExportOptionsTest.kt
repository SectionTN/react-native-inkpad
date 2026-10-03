package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExportOptionsTest {
  @Test
  fun readsTheOptionsTypeScriptSends() {
    val options = ExportOptions.parse(
      """{"format":"jpeg","quality":0.5,"scale":2,"trim":true,"padding":8,"background":false,"base64":true}""",
    )
    assertTrue(options.jpeg)
    assertEquals(0.5f, options.quality, 0f)
    assertEquals(2f, options.scale, 0f)
    assertTrue(options.trim)
    assertEquals(8f, options.padding, 0f)
    assertFalse(options.background)
    assertTrue(options.base64)
  }

  @Test
  fun fallsBackToDefaults() {
    val options = ExportOptions.parse(null)
    assertFalse(options.jpeg)
    assertEquals(1f, options.scale, 0f)
    assertTrue(options.background)
    assertFalse(options.trim)
  }

  @Test
  fun roundsPixelSizesAndNeverReturnsZero() {
    val options = ExportOptions.parse("""{"scale":2.625}""")
    assertEquals(840, options.pixels(320f))
    assertEquals(1, options.pixels(0.1f))
  }
}
