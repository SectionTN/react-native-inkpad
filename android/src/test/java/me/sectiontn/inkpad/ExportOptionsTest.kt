package me.sectiontn.inkpad

import android.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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
  fun readsTheImageTheExportExpects() {
    val options = ExportOptions.parse("""{"backgroundImageUri":"file:///paper.png","backgroundFit":"cover"}""")
    assertEquals("file:///paper.png", options.backgroundImageUri)
    assertEquals(BackgroundFit.COVER, options.backgroundFit)
  }

  @Test
  fun readsTheColorTheExportExpects() {
    assertEquals(ColorHex.toArgb("#FF000080"), ExportOptions.parse("""{"backgroundColor":"#FF000080"}""").backgroundColor)
    assertEquals(Color.TRANSPARENT, ExportOptions.parse("""{"backgroundColor":""}""").backgroundColor)
    assertNull(ExportOptions.parse("{}").backgroundColor)
    assertNull(ExportOptions.parse("""{"backgroundColor":"red"}""").backgroundColor)
  }

  @Test
  fun leavesTheImageAloneWhenTheKeyIsMissing() {
    val options = ExportOptions.parse("{}")
    assertNull(options.backgroundImageUri)
    assertNull(options.backgroundFit)
    assertEquals("", ExportOptions.parse("""{"backgroundImageUri":""}""").backgroundImageUri)
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
    assertEquals(840, options.pixels(320f, options.scale))
    assertEquals(1, options.pixels(0.1f, options.scale))
  }

  @Test
  fun readsMaxSize() {
    assertEquals(160, ExportOptions.parse("""{"maxSize":160}""").maxSize)
    assertEquals(0, ExportOptions.parse("{}").maxSize)
  }

  @Test
  fun capsTheScaleToMaxSize() {
    val options = ExportOptions.parse("""{"scale":2,"maxSize":160}""")
    val scale = options.scaleFor(300f, 200f)
    assertEquals(160, options.pixels(300f, scale))
    assertEquals(107, options.pixels(200f, scale))
  }

  @Test
  fun neverRaisesTheScale() {
    val options = ExportOptions.parse("""{"scale":2,"maxSize":1000}""")
    assertEquals(2f, options.scaleFor(300f, 200f), 0f)
  }

  @Test
  fun clampsTheShortSideToOnePixel() {
    val options = ExportOptions.parse("""{"scale":1,"maxSize":160}""")
    val scale = options.scaleFor(2000f, 10f)
    assertEquals(160, options.pixels(2000f, scale))
    assertEquals(1, options.pixels(10f, scale))
  }
}
