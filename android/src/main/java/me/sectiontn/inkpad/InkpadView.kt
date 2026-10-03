package me.sectiontn.inkpad

import android.annotation.SuppressLint
import android.graphics.Color
import android.graphics.Matrix
import android.view.MotionEvent
import android.widget.FrameLayout
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.geometry.AffineTransform
import androidx.ink.geometry.ImmutableParallelogram
import androidx.ink.geometry.ImmutableSegment
import androidx.ink.geometry.ImmutableVec
import androidx.ink.geometry.Intersection.intersects
import androidx.ink.strokes.Stroke
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper

@SuppressLint("ViewConstructor")
class InkpadView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
  private val density = resources.displayMetrics.density
  private val strokesView = StrokesView(reactContext)
  private val inProgressView = InProgressStrokesView(reactContext)
  private val motionToCanvas = Matrix().apply { setScale(1f / density, 1f / density) }
  private val pending = mutableMapOf<InProgressStrokeId, InkpadStroke.Meta>()
  private var activeStroke: InProgressStrokeId? = null
  private var activePointerId = MotionEvent.INVALID_POINTER_ID

  internal val strokes = mutableListOf<InkpadStroke>()
  private val history = StrokeHistory<InkpadStroke>()

  internal var brushType = BrushType.PEN
  internal var brushColor = Color.BLACK
  internal var brushSize = 3f
  internal var editable = true
  internal var erasing = false
  private var eraserLast: ImmutableVec? = null
  private var eraseBefore: List<InkpadStroke>? = null
  internal var canvasColor = Color.TRANSPARENT
    set(value) {
      field = value
      strokesView.canvasColor = value
      strokesView.invalidate()
    }

  init {
    strokesView.strokes = strokes
    addView(strokesView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    addView(inProgressView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    inProgressView.addFinishedStrokesListener(
      object : InProgressStrokesFinishedListener {
        override fun onStrokesFinished(strokes: Map<InProgressStrokeId, Stroke>) {
          handleFinished(strokes)
        }
      },
    )
  }

  // Fabric does not lay out native children, so run measure and layout ourselves.
  override fun requestLayout() {
    super.requestLayout()
    post { measureAndLayout() }
  }

  private fun measureAndLayout() {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    layout(left, top, right, bottom)
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    val w = r - l
    val h = b - t
    for (i in 0 until childCount) {
      val child = getChildAt(i)
      child.measure(
        MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY),
      )
      child.layout(0, 0, w, h)
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!editable) return false
    return if (erasing) eraseTouch(event) else drawTouch(event)
  }

  private fun drawTouch(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        activePointerId = event.getPointerId(0)
        val brush = Brushes.create(brushType, brushColor, brushSize)
        val id = inProgressView.startStroke(event, activePointerId, brush, motionToCanvas)
        pending[id] = InkpadStroke.Meta(brushType, brushColor, brushSize, inputTypeOf(event.getToolType(0)))
        activeStroke = id
        emit("topInkStrokeStart")
      }
      MotionEvent.ACTION_MOVE -> activeStroke?.let { inProgressView.addToStroke(event, activePointerId, it) }
      MotionEvent.ACTION_UP -> activeStroke?.let {
        inProgressView.finishStroke(event, activePointerId, it)
        activeStroke = null
        emit("topInkStrokeEnd")
      }
      MotionEvent.ACTION_CANCEL -> activeStroke?.let {
        inProgressView.cancelStroke(it, event)
        pending.remove(it)
        activeStroke = null
      }
    }
    return true
  }

  private fun eraseTouch(event: MotionEvent): Boolean {
    val point = ImmutableVec(event.x / density, event.y / density)
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        eraseBefore = strokes.toList()
        eraseAlong(point, point)
        eraserLast = point
      }
      MotionEvent.ACTION_MOVE -> {
        eraserLast?.let { eraseAlong(it, point) }
        eraserLast = point
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        val before = eraseBefore
        if (before != null && before.size != strokes.size) {
          history.record(StrokeHistory.Op.Replace(before, strokes.toList()))
          emitChange()
        }
        eraseBefore = null
        eraserLast = null
      }
    }
    return true
  }

  private fun eraseAlong(from: ImmutableVec, to: ImmutableVec) {
    val area = ImmutableParallelogram.fromSegmentAndPadding(ImmutableSegment(from, to), ERASER_RADIUS)
    if (strokes.removeAll { it.stroke.shape.intersects(area, AffineTransform.IDENTITY) }) {
      strokesView.invalidate()
    }
  }

  private fun handleFinished(finished: Map<InProgressStrokeId, Stroke>) {
    for ((id, stroke) in finished) {
      val meta = pending.remove(id) ?: continue
      val item = InkpadStroke(stroke, meta.type, meta.color, meta.size, meta.input)
      strokes.add(item)
      history.record(StrokeHistory.Op.Add(item))
    }
    strokesView.invalidate()
    inProgressView.removeFinishedStrokes(finished.keys)
    emitChange()
  }

  internal fun emitChange() {
    emit(
      "topInkChange",
      Arguments.createMap().apply {
        putInt("strokeCount", strokes.size)
        putBoolean("canUndo", history.canUndo)
        putBoolean("canRedo", history.canRedo)
      },
    )
  }

  internal fun undo() {
    if (history.undo(strokes)) changed()
  }

  internal fun redo() {
    if (history.redo(strokes)) changed()
  }

  internal fun clear() {
    if (strokes.isNotEmpty()) replaceAll(emptyList())
  }

  private fun replaceAll(next: List<InkpadStroke>) {
    history.record(StrokeHistory.Op.Replace(strokes.toList(), next))
    strokes.clear()
    strokes.addAll(next)
    changed()
  }

  private fun changed() {
    strokesView.invalidate()
    emitChange()
  }

  // getEventDispatcher(context) is missing on RN 0.80, which we still support.
  @Suppress("DEPRECATION")
  internal fun emit(name: String, data: WritableMap = Arguments.createMap()) {
    val surfaceId = UIManagerHelper.getSurfaceId(this)
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(InkEvent(surfaceId, id, name, data))
  }

  private fun inputTypeOf(toolType: Int): InputType = when (toolType) {
    MotionEvent.TOOL_TYPE_STYLUS -> InputType.STYLUS
    MotionEvent.TOOL_TYPE_MOUSE -> InputType.MOUSE
    else -> InputType.TOUCH
  }

  companion object {
    private const val ERASER_RADIUS = 10f
  }
}
