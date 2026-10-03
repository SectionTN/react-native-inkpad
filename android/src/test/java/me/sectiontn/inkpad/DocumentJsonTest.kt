package me.sectiontn.inkpad

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

class DocumentJsonTest {
  private val sample =
    """{"version":1,"size":{"width":300,"height":200},"strokes":[""" +
      """{"brush":{"type":"pen","color":"#112233FF","size":3},"input":"touch",""" +
      """"points":[10,10,0,-1,-1,-1,20,12.5,16,-1,-1,-1]}]}"""

  @Test
  fun parsesAValidDocument() {
    val doc = DocumentJson.parse(sample)
    assertEquals(300f, doc.width, 0f)
    assertEquals(1, doc.strokes.size)
    val stroke = doc.strokes[0]
    assertEquals(BrushType.PEN, stroke.type)
    assertEquals(0xFF112233.toInt(), stroke.color)
    assertEquals(InputType.TOUCH, stroke.input)
    assertEquals(12.5f, stroke.points[7], 0f)
  }

  @Test
  fun readsBackWhatItWrites() {
    val first = DocumentJson.parse(sample)
    val again = DocumentJson.parse(DocumentJson.write(first))
    assertArrayEquals(first.strokes[0].points, again.strokes[0].points, 0.0001f)
    assertEquals(first.strokes[0].color, again.strokes[0].color)
  }

  @Test
  fun rejectsNewerVersions() {
    assertCode("E_UNSUPPORTED_VERSION") { DocumentJson.parse(sample.replace("\"version\":1", "\"version\":2")) }
  }

  @Test
  fun rejectsPressureOnSomePointsOnly() {
    assertCode("E_INVALID_DOCUMENT") { DocumentJson.parse(sample.replace("[10,10,0,-1", "[10,10,0,0.5")) }
  }

  @Test
  fun rejectsColorsWithoutAlpha() {
    assertCode("E_INVALID_DOCUMENT") { DocumentJson.parse(sample.replace("#112233FF", "#112233")) }
  }

  @Test
  fun rejectsTimeGoingBackwards() {
    assertCode("E_INVALID_DOCUMENT") { DocumentJson.parse(sample.replace("[10,10,0,", "[10,10,20,")) }
  }

  @Test
  fun rejectsSomethingThatIsNotJson() {
    assertCode("E_INVALID_DOCUMENT") { DocumentJson.parse("not json") }
  }

  private fun assertCode(code: String, block: () -> Unit) {
    try {
      block()
      fail("expected $code")
    } catch (e: InkpadException) {
      assertEquals(code, e.code)
    }
  }
}
