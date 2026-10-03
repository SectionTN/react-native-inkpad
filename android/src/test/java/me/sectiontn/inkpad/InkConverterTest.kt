package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Test

class InkConverterTest {
  @Test
  fun aDpIsOneSixtiethOfAnInchOnABucketScreen() {
    assertEquals(2.54f / 160f, InkConverter.strokeUnitLengthCm(3.25f, 520f, 520f), 1e-6f)
  }

  @Test
  fun averagesTheTwoAxes() {
    assertEquals(2.54f * (1f / 400f + 1f / 600f), InkConverter.strokeUnitLengthCm(2f, 400f, 600f), 1e-6f)
  }
}
