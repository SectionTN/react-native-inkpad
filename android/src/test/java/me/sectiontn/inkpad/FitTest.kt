package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Test

class FitTest {
  @Test
  fun containsAWideImageInASquareBox() {
    assertEquals(FitRect(0f, 75f, 300f, 150f), Fit.rect(200f, 100f, 300f, 300f, BackgroundFit.CONTAIN))
  }

  @Test
  fun coversASquareBoxWithAWideImage() {
    assertEquals(FitRect(-150f, 0f, 600f, 300f), Fit.rect(200f, 100f, 300f, 300f, BackgroundFit.COVER))
  }

  @Test
  fun containsATallImageInAWideBox() {
    assertEquals(FitRect(125f, 0f, 50f, 200f), Fit.rect(100f, 400f, 300f, 200f, BackgroundFit.CONTAIN))
  }

  @Test
  fun coversAWideBoxWithATallImage() {
    assertEquals(FitRect(0f, -500f, 300f, 1200f), Fit.rect(100f, 400f, 300f, 200f, BackgroundFit.COVER))
  }

  @Test
  fun fillsTheBoxWhenAspectRatiosMatch() {
    val fill = FitRect(0f, 0f, 300f, 200f)
    assertEquals(fill, Fit.rect(150f, 100f, 300f, 200f, BackgroundFit.CONTAIN))
    assertEquals(fill, Fit.rect(150f, 100f, 300f, 200f, BackgroundFit.COVER))
  }

  @Test
  fun putsAnEmptyImageAtTheBoxCenter() {
    assertEquals(FitRect(150f, 100f, 0f, 0f), Fit.rect(0f, 0f, 300f, 200f, BackgroundFit.CONTAIN))
  }
}
