package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ColorHexTest {
  @Test
  fun parsesRrggbbaaIntoArgb() {
    assertEquals(0x44112233, ColorHex.toArgb("#11223344"))
    assertEquals(0xFF112233.toInt(), ColorHex.toArgb("#112233ff"))
  }

  @Test
  fun formatsArgbAsUppercaseRrggbbaa() {
    assertEquals("#11223344", ColorHex.fromArgb(0x44112233))
    assertEquals("#ABCDEFFF", ColorHex.fromArgb(0xFFABCDEF.toInt()))
  }

  @Test
  fun lowersOpaqueHighlighterColorsToFortyPercent() {
    assertEquals(0x66FFEE00, ColorHex.highlighterArgb(0xFFFFEE00.toInt()))
    assertEquals(0x33FFEE00, ColorHex.highlighterArgb(0x33FFEE00))
  }

  @Test
  fun validatesTheFormat() {
    assertTrue(ColorHex.isValid("#A1B2C3D4"))
    assertFalse(ColorHex.isValid("#A1B2C3"))
    assertFalse(ColorHex.isValid("A1B2C3D4"))
  }
}
