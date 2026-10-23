package me.sectiontn.inkpad

// Runs view commands in the order JS sent them while some finish on another thread. Main thread only.
internal class CommandQueue {
  class Slot internal constructor() {
    internal var action: (() -> Unit)? = null
  }

  private val slots = ArrayDeque<Slot>()

  fun run(action: () -> Unit) = fill(reserve(), action)

  // Holds a place for a command that finishes later, so the ones sent after it wait.
  fun reserve(): Slot = Slot().also(slots::addLast)

  fun fill(slot: Slot, action: () -> Unit) {
    slot.action = action
    while (true) {
      val next = slots.firstOrNull()?.action ?: return
      slots.removeFirst()
      next()
    }
  }
}
