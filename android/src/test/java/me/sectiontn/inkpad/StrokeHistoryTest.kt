package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StrokeHistoryTest {
  @Test
  fun undoesAndRedoesAnAddedItem() {
    val items = mutableListOf("a")
    val history = StrokeHistory<String>()
    items.add("b")
    history.record(StrokeHistory.Op.Add("b"))

    assertTrue(history.undo(items))
    assertEquals(listOf("a"), items)
    assertTrue(history.redo(items))
    assertEquals(listOf("a", "b"), items)
  }

  @Test
  fun replaceRestoresTheWholeList() {
    val items = mutableListOf("a", "b", "c")
    val history = StrokeHistory<String>()
    val before = items.toList()
    items.clear()
    history.record(StrokeHistory.Op.Replace(before, emptyList()))

    history.undo(items)
    assertEquals(listOf("a", "b", "c"), items)
    history.redo(items)
    assertEquals(emptyList<String>(), items)
  }

  @Test
  fun recordingDropsTheRedoStack() {
    val items = mutableListOf<String>()
    val history = StrokeHistory<String>()
    items.add("a")
    history.record(StrokeHistory.Op.Add("a"))
    history.undo(items)
    assertTrue(history.canRedo)

    items.add("b")
    history.record(StrokeHistory.Op.Add("b"))
    assertFalse(history.canRedo)
  }

  @Test
  fun undoWithNothingRecordedDoesNothing() {
    assertFalse(StrokeHistory<String>().undo(mutableListOf()))
  }
}
