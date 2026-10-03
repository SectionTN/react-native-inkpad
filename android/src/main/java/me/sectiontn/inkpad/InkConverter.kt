package me.sectiontn.inkpad

import androidx.ink.brush.InputToolType
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput

internal object InkConverter {
  fun toInk(stroke: DocStroke): InkpadStroke {
    val tool = when (stroke.input) {
      InputType.STYLUS -> InputToolType.STYLUS
      InputType.MOUSE -> InputToolType.MOUSE
      InputType.TOUCH -> InputToolType.TOUCH
    }
    val batch = MutableStrokeInputBatch()
    val p = stroke.points
    var i = 0
    while (i < p.size) {
      batch.add(tool, p[i], p[i + 1], p[i + 2].toLong(), StrokeInput.NO_STROKE_UNIT_LENGTH, p[i + 3], p[i + 4], p[i + 5])
      i += DocumentJson.STRIDE
    }
    val ink = Stroke(Brushes.create(stroke.type, stroke.color, stroke.size), batch)
    return InkpadStroke(ink, stroke.type, stroke.color, stroke.size, stroke.input)
  }

  fun fromInk(item: InkpadStroke): DocStroke {
    val inputs = item.stroke.inputs
    val points = FloatArray(inputs.size * DocumentJson.STRIDE)
    val input = StrokeInput()
    for (i in 0 until inputs.size) {
      inputs.populate(i, input)
      val o = i * DocumentJson.STRIDE
      points[o] = input.x
      points[o + 1] = input.y
      points[o + 2] = input.elapsedTimeMillis.toFloat()
      points[o + 3] = if (input.hasPressure) input.pressure else -1f
      points[o + 4] = if (input.hasTilt) input.tiltRadians else -1f
      points[o + 5] = if (input.hasOrientation) input.orientationRadians else -1f
    }
    return DocStroke(item.type, item.color, item.size, item.input, points)
  }
}
