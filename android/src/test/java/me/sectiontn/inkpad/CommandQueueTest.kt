package me.sectiontn.inkpad

import org.junit.Assert.assertEquals
import org.junit.Test

class CommandQueueTest {
  private val log = mutableListOf<String>()
  private val queue = CommandQueue()

  @Test
  fun runsACommandRightAwayWhenNothingWaits() {
    queue.run { log += "clear" }

    assertEquals(listOf("clear"), log)
  }

  @Test
  fun holdsCommandsBehindAReservedSlot() {
    val load = queue.reserve()
    queue.run { log += "clear" }
    assertEquals(emptyList<String>(), log)

    queue.fill(load) { log += "load" }

    assertEquals(listOf("load", "clear"), log)
  }

  @Test
  fun appliesLoadsInTheOrderTheyWereSentWhenTheyFinishOutOfOrder() {
    val first = queue.reserve()
    queue.run { log += "clear" }
    val second = queue.reserve()
    queue.run { log += "undo" }

    queue.fill(second) { log += "second" }
    assertEquals(emptyList<String>(), log)
    queue.fill(first) { log += "first" }

    assertEquals(listOf("first", "clear", "second", "undo"), log)
  }

  @Test
  fun runsCommandsRightAwayAgainOnceTheQueueDrains() {
    val load = queue.reserve()
    queue.fill(load) { log += "load" }
    queue.run { log += "redo" }

    assertEquals(listOf("load", "redo"), log)
  }
}
