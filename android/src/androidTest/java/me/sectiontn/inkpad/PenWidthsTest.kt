package me.sectiontn.inkpad

import android.util.Log
import androidx.ink.geometry.MutableVec
import androidx.ink.geometry.PartitionedMesh
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max

@RunWith(AndroidJUnit4::class)
class PenWidthsTest {
  private class Segment(val ax: Float, val ay: Float, val bx: Float, val by: Float)

  @Test
  fun inkDrawsTheSharedPenWidths() {
    val assets = InstrumentationRegistry.getInstrumentation().context.assets
    val root = JSONObject(assets.open("pen-widths.json").bufferedReader().readText())
    val unitLengthCm = root.getDouble("unitLengthCm").toFloat()
    val strokes = root.getJSONArray("strokes")
    val report = mutableListOf<String>()
    var failures = 0
    for (s in 0 until strokes.length()) {
      val fixture = strokes.getJSONObject(s)
      val points = floats(fixture.getJSONArray("points"))
      val widths = floats(fixture.getJSONArray("widths"))
      val type = BrushType.from(fixture.optString("brush", "pen"))!!
      val input = InputType.from(fixture.getString("input"))!!
      val doc = DocStroke(type, 0xFF000000.toInt(), fixture.getDouble("size").toFloat(), input, points)
      val outline = outline(InkConverter.toInk(doc, unitLengthCm).stroke.shape)
      val samples = fixture.getJSONArray("samples")
      for (k in 0 until samples.length()) {
        val i = samples.getInt(k)
        val measured = crossSection(points, i, outline)
        val expected = widths[i]
        val ok = abs(measured - expected) <= max(TOLERANCE * expected, MIN_TOLERANCE)
        if (!ok) failures++
        report += "${fixture.getString("name")}[$i] expected $expected measured $measured${if (ok) "" else " FAIL"}"
      }
    }
    report.forEach { Log.i("PenWidthsTest", it) }
    assertTrue(report.joinToString("\n"), failures == 0)
  }

  private fun floats(array: JSONArray) = FloatArray(array.length()) { array.getDouble(it).toFloat() }

  private fun outline(shape: PartitionedMesh): List<Segment> {
    val segments = mutableListOf<Segment>()
    val a = MutableVec()
    val b = MutableVec()
    for (group in 0 until shape.getRenderGroupCount()) {
      for (o in 0 until shape.getOutlineCount(group)) {
        val count = shape.getOutlineVertexCount(group, o)
        for (v in 0 until count) {
          shape.populateOutlinePosition(group, o, v, a)
          shape.populateOutlinePosition(group, o, (v + 1) % count, b)
          segments += Segment(a.x, a.y, b.x, b.y)
        }
      }
    }
    return segments
  }

  // Length of the cut through point i, perpendicular to its neighbors, between the nearest outline crossings.
  private fun crossSection(points: FloatArray, i: Int, outline: List<Segment>): Float {
    val stride = DocumentJson.STRIDE
    val count = points.size / stride
    val px = points[i * stride]
    val py = points[i * stride + 1]
    val before = maxOf(0, i - 1) * stride
    val after = minOf(count - 1, i + 1) * stride
    var dx = points[after] - points[before]
    var dy = points[after + 1] - points[before + 1]
    if (dx == 0f && dy == 0f) dx = 1f
    val length = hypot(dx, dy)
    val nx = -dy / length
    val ny = dx / length
    var ahead = Float.MAX_VALUE
    var behind = Float.MAX_VALUE
    for (s in outline) {
      val ex = s.bx - s.ax
      val ey = s.by - s.ay
      val denominator = nx * ey - ny * ex
      if (denominator == 0f) continue
      val t = ((s.ax - px) * ey - (s.ay - py) * ex) / denominator
      val u = ((s.ax - px) * ny - (s.ay - py) * nx) / denominator
      if (u < 0f || u > 1f) continue
      if (t >= 0f) ahead = minOf(ahead, t) else behind = minOf(behind, -t)
    }
    return ahead + behind
  }

  private companion object {
    const val TOLERANCE = 0.04f
    const val MIN_TOLERANCE = 0.1f
  }
}
