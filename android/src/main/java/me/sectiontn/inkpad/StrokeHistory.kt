package me.sectiontn.inkpad

internal class StrokeHistory<T> {
  sealed interface Op<T> {
    class Add<T>(val item: T) : Op<T>

    class Replace<T>(val before: List<T>, val after: List<T>) : Op<T>
  }

  private val undoStack = ArrayDeque<Op<T>>()
  private val redoStack = ArrayDeque<Op<T>>()

  val canUndo: Boolean get() = undoStack.isNotEmpty()
  val canRedo: Boolean get() = redoStack.isNotEmpty()

  fun record(op: Op<T>) {
    undoStack.addLast(op)
    redoStack.clear()
  }

  // An Add is always the last item when it gets undone, because later ops are undone first.
  fun undo(items: MutableList<T>): Boolean {
    val op = undoStack.removeLastOrNull() ?: return false
    when (op) {
      is Op.Add -> items.removeAt(items.lastIndex)
      is Op.Replace -> items.replaceWith(op.before)
    }
    redoStack.addLast(op)
    return true
  }

  fun redo(items: MutableList<T>): Boolean {
    val op = redoStack.removeLastOrNull() ?: return false
    when (op) {
      is Op.Add -> items.add(op.item)
      is Op.Replace -> items.replaceWith(op.after)
    }
    undoStack.addLast(op)
    return true
  }

  private fun MutableList<T>.replaceWith(values: List<T>) {
    clear()
    addAll(values)
  }
}
