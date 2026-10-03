package me.sectiontn.inkpad

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class InkEvent(
  surfaceId: Int,
  viewId: Int,
  private val name: String,
  private val data: WritableMap,
) : Event<InkEvent>(surfaceId, viewId) {
  override fun getEventName(): String = name

  override fun getEventData(): WritableMap = data

  // Every result must reach JS, so two events with the same name never merge.
  override fun canCoalesce(): Boolean = false
}
