package me.sectiontn.inkpad

import java.util.Locale

internal object ColorHex {
  private val PATTERN = Regex("^#[0-9A-Fa-f]{8}$")
  private const val HIGHLIGHTER_ALPHA = 0x66

  fun isValid(hex: String): Boolean = PATTERN.matches(hex)

  fun toArgb(hex: String): Int {
    val value = hex.substring(1).toLong(16)
    val rgb = (value ushr 8).toInt() and 0xFFFFFF
    val alpha = (value and 0xFF).toInt()
    return (alpha shl 24) or rgb
  }

  fun fromArgb(argb: Int): String =
    String.format(Locale.ROOT, "#%06X%02X", argb and 0xFFFFFF, (argb ushr 24) and 0xFF)

  // An opaque highlighter would hide what is under it, so it draws at 40% alpha.
  fun highlighterArgb(argb: Int): Int =
    if ((argb ushr 24) == 0xFF) (argb and 0xFFFFFF) or (HIGHLIGHTER_ALPHA shl 24) else argb
}
