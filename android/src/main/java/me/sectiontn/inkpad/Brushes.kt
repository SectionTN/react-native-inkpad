package me.sectiontn.inkpad

import android.util.Base64
import androidx.ink.brush.Brush
import androidx.ink.brush.BrushFamily
import androidx.ink.brush.StockBrushes
import androidx.ink.storage.BrushFamilyDecodeCallback
import androidx.ink.storage.decode
import java.io.ByteArrayInputStream

internal object Brushes {
  private const val EPSILON = 0.1f
  private const val MIN_SIZE = 0.5f
  private const val MAX_SIZE = 200f

  // pressurePen that thins with speed for touch and mouse, encoded with Ink 1.0, whose builder API is gone in 1.1.
  private const val PEN =
    "H4sIAAAAAAAA/5PiyszLLkhM0S1IzVN6zsR1h4mXgaHBXhREyIIIVQYg0AURpiDCyqFKgIuPQ1CAURbEBcoecASL8INFDoDVO1SxGDFxsFaxWDFxMFbxOfFwcEMMnDVzpp2VEli9EFi9gwPYfLAaZpilDvZWumA13EA1aWnP7FTT0tTsqzi12DkYRc+eOWODrLz/0FSYcjWwkQsOAY1MO4xDOVDe3soYrJwRqPzsGR+Qixvsq1iUmDg4oJr6D31F03TA3soSrEkW4fEPjmBNbGDPskC1cl1XtkXWCvKxL0hDKIgQYpJglAJiLR4tLl7u64ttRBO5t1kDAL5rj9qEAQAA"

  private val pen: BrushFamily by lazy {
    val bytes = ByteArrayInputStream(Base64.decode(PEN, Base64.DEFAULT))
    BrushFamily.decode(bytes, BrushFamilyDecodeCallback { id, _ -> id })
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
