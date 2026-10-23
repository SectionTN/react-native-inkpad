package me.sectiontn.inkpad

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.soloader.SoLoader
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class InkpadViewCommandsTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private lateinit var context: RecordingReactContext
  private lateinit var view: InkpadView

  @Before
  fun createView() {
    val base = instrumentation.targetContext
    // Events build their payloads with React Native's native maps.
    SoLoader.init(base, OpenSourceMergedSoMapping)
    context = RecordingReactContext(base)
    onMain {
      view = InkpadView(ThemedReactContext(context, base, null, -1))
      view.layout(0, 0, 400, 400)
    }
  }

  @Test
  fun loadsStrokesWhileDetached() {
    onMain { view.setStrokes(1, document(3)) }

    assertEquals(3, settledStrokeCount())
  }

  @Test
  fun clearWaitsForAPendingLoad() {
    onMain {
      view.setStrokes(1, document(3))
      view.clear()
    }

    assertEquals(0, settledStrokeCount())
  }

  @Test
  fun undoWaitsForAPendingLoad() {
    onMain { view.setStrokes(1, document(2)) }
    settledStrokeCount()
    onMain {
      view.setStrokes(2, document(5))
      view.undo()
    }

    assertEquals(2, settledStrokeCount())
  }

  @Test
  fun getStrokesWaitsForAPendingLoad() {
    onMain {
      view.setStrokes(1, document(4))
      view.getStrokes(2)
    }
    settle()

    assertEquals(4, DocumentJson.parse(payload(2)).strokes.size)
  }

  @Test
  fun appliesLoadsInTheOrderTheyWereSent() {
    onMain {
      view.setStrokes(1, document(200))
      view.setStrokes(2, document(1))
    }

    assertEquals(1, settledStrokeCount())
  }

  @Test
  fun runsCommandsSentAfterALoadThatFails() {
    onMain { view.setStrokes(1, document(3)) }
    settledStrokeCount()
    onMain {
      view.setStrokes(2, "not a document")
      view.clear()
    }

    assertEquals(0, settledStrokeCount())
  }

  private fun onMain(block: () -> Unit) = instrumentation.runOnMainSync(block)

  // Two rounds, since a load that lands on the main thread can start a save on the document thread.
  private fun settle() = repeat(2) {
    InkpadView.WORKER.submit {}.get()
    instrumentation.waitForIdleSync()
  }

  private fun settledStrokeCount(): Int {
    settle()
    var count = -1
    onMain { count = view.strokes.size }
    return count
  }

  private fun payload(requestId: Int): String {
    var payload: String? = null
    onMain {
      payload = context.events
        .firstOrNull { it.hasKey("requestId") && it.getInt("requestId") == requestId }
        ?.getString("payload")
    }
    return checkNotNull(payload) { "no answer to request $requestId" }
  }

  private fun document(strokes: Int): String = DocumentJson.write(
    Doc(
      400f,
      400f,
      List(strokes) { s ->
        val points = FloatArray(20 * 6) { k ->
          when (k % 6) {
            0 -> 20f + (k / 6) * 5
            1 -> 20f + s * 30
            2 -> (k / 6) * 8f
            else -> -1f
          }
        }
        DocStroke(BrushType.PEN, 0xFF000000.toInt(), 3f, InputType.TOUCH, points)
      },
    ),
  )
}
