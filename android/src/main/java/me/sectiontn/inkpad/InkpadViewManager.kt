package me.sectiontn.inkpad

import android.graphics.Color
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.InkpadViewManagerDelegate
import com.facebook.react.viewmanagers.InkpadViewManagerInterface

@ReactModule(name = InkpadViewManager.NAME)
class InkpadViewManager : SimpleViewManager<InkpadView>(), InkpadViewManagerInterface<InkpadView> {
  private val generated = InkpadViewManagerDelegate(this)

  // Wraps the codegen delegate so border props reach the canvas; RN's base delegate drops them.
  private val delegate = object : ViewManagerDelegate<InkpadView> {
    @Suppress("ACCIDENTAL_OVERRIDE")
    override fun setProperty(view: InkpadView, propName: String, value: Any?) {
      if (!BorderProps.apply(view, propName, value)) generated.setProperty(view, propName, value)
    }

    @Suppress("ACCIDENTAL_OVERRIDE")
    override fun receiveCommand(view: InkpadView, commandName: String, args: ReadableArray) {
      generated.receiveCommand(view, commandName, args)
    }
  }

  override fun getDelegate(): ViewManagerDelegate<InkpadView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): InkpadView = InkpadView(context)

  @ReactProp(name = "brushType")
  override fun setBrushType(view: InkpadView, value: String?) {
    view.brushType = BrushType.from(value) ?: BrushType.PEN
  }

  @ReactProp(name = "brushColor", customType = "Color")
  override fun setBrushColor(view: InkpadView, value: Int?) {
    view.brushColor = value ?: Color.BLACK
  }

  @ReactProp(name = "brushSize", defaultFloat = 3f)
  override fun setBrushSize(view: InkpadView, value: Float) {
    view.brushSize = value
  }

  @ReactProp(name = "tool")
  override fun setTool(view: InkpadView, value: String?) {
    view.erasing = value == "erase"
  }

  @ReactProp(name = "editable", defaultBoolean = true)
  override fun setEditable(view: InkpadView, value: Boolean) {
    view.editable = value
  }

  @ReactProp(name = "canvasColor", customType = "Color")
  override fun setCanvasColor(view: InkpadView, value: Int?) {
    view.canvasColor = value ?: Color.TRANSPARENT
  }

  override fun undo(view: InkpadView) = view.undo()

  override fun redo(view: InkpadView) = view.redo()

  override fun clear(view: InkpadView) = view.clear()

  override fun getStrokes(view: InkpadView, requestId: Int) = view.getStrokes(requestId)

  override fun setStrokes(view: InkpadView, requestId: Int, json: String?) = view.setStrokes(requestId, json)

  override fun exportImage(view: InkpadView, requestId: Int, optionsJson: String?) =
    view.exportImage(requestId, optionsJson)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    EVENTS.associateWith { mapOf("registrationName" to it.replaceFirst("top", "on")) }

  companion object {
    const val NAME = "InkpadView"
    private val EVENTS = listOf("topInkStrokeStart", "topInkStrokeEnd", "topInkChange", "topInkResult")
  }
}
