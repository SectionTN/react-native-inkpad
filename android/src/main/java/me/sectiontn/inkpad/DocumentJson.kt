package me.sectiontn.inkpad

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.roundToLong

internal class DocStroke(
  val type: BrushType,
  val color: Int,
  val size: Float,
  val input: InputType,
  val points: FloatArray,
)

internal class Doc(val width: Float, val height: Float, val strokes: List<DocStroke>)

internal object DocumentJson {
  const val VERSION = 1
  const val STRIDE = 6

  fun parse(json: String): Doc {
    val root = try {
      JSONObject(json)
    } catch (e: JSONException) {
      invalid("document is not a JSON object")
    }
    val version = root.optInt("version", -1)
    if (version > VERSION) {
      throw InkpadException(ErrorCodes.UNSUPPORTED_VERSION, "document version $version is newer than $VERSION")
    }
    if (version != VERSION) invalid("version must be $VERSION")
    val size = root.optJSONObject("size") ?: invalid("size must be an object")
    val width = positive(size.opt("width"), "size.width")
    val height = positive(size.opt("height"), "size.height")
    val strokes = root.optJSONArray("strokes") ?: invalid("strokes must be an array")
    return Doc(width, height, (0 until strokes.length()).map { parseStroke(strokes.optJSONObject(it), it) })
  }

  fun write(doc: Doc): String {
    val strokes = JSONArray()
    for (stroke in doc.strokes) {
      val points = JSONArray()
      var i = 0
      while (i < stroke.points.size) {
        points.put(round(stroke.points[i], 100.0))
        points.put(round(stroke.points[i + 1], 100.0))
        points.put(stroke.points[i + 2].toLong())
        for (k in 3..5) {
          val value = stroke.points[i + k]
          if (value < 0f) points.put(-1) else points.put(round(value, 1000.0))
        }
        i += STRIDE
      }
      val brush = JSONObject()
        .put("type", stroke.type.id)
        .put("color", ColorHex.fromArgb(stroke.color))
        .put("size", stroke.size.toDouble())
      strokes.put(JSONObject().put("brush", brush).put("input", stroke.input.id).put("points", points))
    }
    return JSONObject()
      .put("version", VERSION)
      .put("size", JSONObject().put("width", doc.width.toDouble()).put("height", doc.height.toDouble()))
      .put("strokes", strokes)
      .toString()
  }

  private fun parseStroke(value: JSONObject?, index: Int): DocStroke {
    val path = "strokes[$index]"
    if (value == null) invalid("$path must be an object")
    val brush = value.optJSONObject("brush") ?: invalid("$path must have a brush")
    val type = BrushType.from(brush.optString("type")) ?: invalid("$path.brush.type is not a known brush")
    val colorHex = brush.optString("color")
    if (!ColorHex.isValid(colorHex)) invalid("$path.brush.color must be #RRGGBBAA")
    val size = positive(brush.opt("size"), "$path.brush.size")
    val input = InputType.from(value.optString("input")) ?: invalid("$path.input is not a known input type")
    val raw = value.optJSONArray("points") ?: invalid("$path.points must be an array")
    if (raw.length() == 0 || raw.length() % STRIDE != 0) invalid("$path.points must hold 6 numbers per point")
    val points = FloatArray(raw.length()) { i ->
      val number = (raw.opt(i) as? Number)?.toDouble()
      if (number == null || !number.isFinite()) invalid("$path.points must only hold numbers")
      number.toFloat()
    }
    checkTimes(points, path)
    checkChannel(points, 3, 1f, "$path pressure")
    checkChannel(points, 4, (PI / 2).toFloat(), "$path tilt")
    checkChannel(points, 5, (PI * 2).toFloat(), "$path orientation")
    return DocStroke(type, ColorHex.toArgb(colorHex), size, input, points)
  }

  private fun checkTimes(points: FloatArray, path: String) {
    var previous = 0f
    var i = 2
    while (i < points.size) {
      val t = points[i]
      if (t != floor(t) || t < previous) invalid("$path.points times must be whole, non-decreasing milliseconds")
      previous = t
      i += STRIDE
    }
  }

  // Ink needs each optional channel on every point of a stroke or on none of them.
  private fun checkChannel(points: FloatArray, offset: Int, max: Float, path: String) {
    val reported = points[offset] != -1f
    var i = offset
    while (i < points.size) {
      val value = points[i]
      if (!reported && value != -1f) invalid("$path must be -1 for every point or for none")
      if (reported && (value < 0f || value > max)) invalid("$path must be between 0 and $max")
      i += STRIDE
    }
  }

  private fun positive(value: Any?, path: String): Float {
    val number = (value as? Number)?.toDouble()
    if (number == null || !number.isFinite() || number <= 0) invalid("$path must be a positive number")
    return number.toFloat()
  }

  private fun round(value: Float, factor: Double): Double = (value * factor).roundToLong() / factor

  private fun invalid(message: String): Nothing = throw InkpadException(ErrorCodes.INVALID_DOCUMENT, message)
}
