package me.sectiontn.inkpad

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.soloader.SoLoader
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class DocumentRendererTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private lateinit var base: Context
  private lateinit var context: RecordingReactContext

  @Before
  fun createContext() {
    base = instrumentation.targetContext
    // Events build their payloads with React Native's native maps.
    SoLoader.init(base, OpenSourceMergedSoMapping)
    context = RecordingReactContext(base)
  }

  @Test
  fun matchesTheCanvasExport() {
    val density = base.resources.displayMetrics.density
    val (view, doc) = drawnCanvas()

    val cases = listOf(
      "{}",
      """{"trim":true,"padding":8}""",
      """{"backgroundColor":"#FFEEDDFF"}""",
      """{"maxSize":160}""",
      JSONObject().put("backgroundImageUri", paper).put("backgroundFit", "contain").toString(),
    )
    for ((i, case) in cases.withIndex()) {
      val options = options(case, density)
      val requestId = 10 + i
      onMain { view.exportImage(requestId, options) }
      settle()
      val canvas = decode(payload(requestId))
      val rendered = decode(render(doc, options).getOrThrow())
      assertTrue("$case differs from the canvas export", canvas.sameAs(rendered))
      if (case.contains("trim")) assertTrue(rendered.width < 320 * density)
      if (case.contains("backgroundColor")) assertEquals(0xFFFFEEDD.toInt(), rendered.getPixel(0, 0))
      if (case.contains("maxSize")) {
        assertEquals(160, maxOf(canvas.width, canvas.height))
        assertEquals(160, maxOf(rendered.width, rendered.height))
      }
      // The center of the canvas is inside the contained image and clear of every stroke.
      if (case.contains("backgroundImageUri")) {
        assertEquals(255, Color.alpha(rendered.getPixel(rendered.width / 2, rendered.height / 2)))
      }
    }
  }

  @Test
  fun rendersAnEmptyDocumentAtItsSize() {
    val bitmap = decode(render(EMPTY, options("{}", 2f)).getOrThrow())

    assertEquals(640, bitmap.width)
    assertEquals(480, bitmap.height)
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    assertTrue(pixels.all { it == 0 })
  }

  @Test
  fun rejectsTrimOnAnEmptyDocument() {
    val result = render(EMPTY, options("""{"trim":true}""", 2f))

    assertEquals(ErrorCodes.EMPTY, (result.exceptionOrNull() as? InkpadException)?.code)
  }

  @Test
  fun rejectsABackgroundThatFailsToLoad() {
    val result = render(EMPTY, options("""{"backgroundImageUri":"file:///nonexistent.png"}""", 2f))

    assertEquals(ErrorCodes.IMAGE_LOAD, (result.exceptionOrNull() as? InkpadException)?.code)
  }

  @Test
  fun settlesManyRendersAtOnce() = settlesManyRenders(options("{}", 1f))

  @Test
  fun settlesManyRendersWithABackground() =
    settlesManyRenders(options(JSONObject().put("backgroundImageUri", paper).toString(), 1f))

  @Test
  fun exportsAndRendersAtTheSameTime() {
    val (view, doc) = drawnCanvas()
    val options = options("{}", 1f)
    onMain { view.exportImage(10, options) }
    settle()
    val reference = decode(payload(10))
    val count = 20
    val latch = CountDownLatch(count)
    val rendered = Collections.synchronizedList(mutableListOf<Result<String>>())
    onMain {
      repeat(count) { i ->
        view.exportImage(100 + i, options)
        DocumentRenderer.render(context, doc, options) { result ->
          rendered += result
          latch.countDown()
        }
      }
    }

    assertTrue("renders still pending after 30 s", latch.await(30, TimeUnit.SECONDS))
    settle()
    repeat(count) { i ->
      val canvas = decode(payload(100 + i))
      assertTrue("canvas export $i differs", reference.sameAs(canvas))
      canvas.recycle()
    }
    rendered.forEachIndexed { i, result ->
      val bitmap = decode(result.getOrThrow())
      assertTrue("render $i differs", reference.sameAs(bitmap))
      bitmap.recycle()
    }
  }

  private fun settlesManyRenders(options: String) {
    val count = 20
    val latch = CountDownLatch(count)
    val results = Collections.synchronizedList(mutableListOf<Result<String>>())
    val threads = Collections.synchronizedSet(mutableSetOf<Thread>())
    val doc = drawing()
    repeat(count) {
      DocumentRenderer.render(context, doc, options) { result ->
        results += result
        threads += Thread.currentThread()
        latch.countDown()
      }
    }

    assertTrue("renders still pending after 30 s", latch.await(30, TimeUnit.SECONDS))
    val uris = results.map { JSONObject(it.getOrThrow()).getString("uri") }
    assertEquals(count, uris.toSet().size)
    val renderer = InkpadExecutors.renderer.submit<Thread> { Thread.currentThread() }.get()
    assertEquals(setOf(renderer), threads.toSet())
    uris.forEach { File(Uri.parse(it).path!!).delete() }
  }

  // A laid out 320 x 240 dp canvas that holds the drawing, and the document it saved.
  private fun drawnCanvas(): Pair<InkpadView, String> {
    val density = base.resources.displayMetrics.density
    val width = 320 * density
    val height = 240 * density
    assertTrue("320 x 240 dp is $width x $height px", width % 1f == 0f && height % 1f == 0f)
    lateinit var view: InkpadView
    onMain {
      view = InkpadView(ThemedReactContext(context, base, null, -1))
      view.layout(0, 0, width.toInt(), height.toInt())
      view.setStrokes(1, drawing())
      view.getStrokes(2)
    }
    settle()
    val doc = payload(2)
    assertEquals(4, DocumentJson.parse(doc).strokes.size)
    onMain { view.setStrokes(3, doc) }
    settle()
    return view to doc
  }

  private fun onMain(block: () -> Unit) = instrumentation.runOnMainSync(block)

  // Two rounds, since an answer that lands on the main thread can start the next background job.
  private fun settle() = repeat(2) {
    InkpadExecutors.worker.submit {}.get()
    InkpadExecutors.exporter.submit {}.get()
    instrumentation.waitForIdleSync()
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

  private fun render(document: String, options: String): Result<String> {
    val latch = CountDownLatch(1)
    var result: Result<String>? = null
    DocumentRenderer.render(context, document, options) {
      result = it
      latch.countDown()
    }
    assertTrue("render still pending after 30 s", latch.await(30, TimeUnit.SECONDS))
    return result!!
  }

  private fun decode(json: String): Bitmap {
    val file = File(Uri.parse(JSONObject(json).getString("uri")).path!!)
    val bitmap = checkNotNull(BitmapFactory.decodeFile(file.path)) { "could not decode $file" }
    file.delete()
    return bitmap
  }

  // The same background keys renderImage and toImage send, empty when unset.
  private fun options(case: String, scale: Float): String {
    val options = JSONObject()
      .put("scale", scale.toDouble())
      .put("background", true)
      .put("backgroundColor", "")
      .put("backgroundImageUri", "")
      .put("backgroundFit", "contain")
    val extra = JSONObject(case)
    for (key in extra.keys()) options.put(key, extra.get(key))
    return options.toString()
  }

  private fun drawing(): String = DocumentJson.write(
    Doc(
      320f,
      240f,
      listOf(
        stroke(BrushType.PEN, InputType.TOUCH, 0xFF000000.toInt(), 3f, 40f),
        stroke(BrushType.PEN, InputType.STYLUS, 0xFF1E40AF.toInt(), 4f, 90f),
        stroke(BrushType.MARKER, InputType.TOUCH, 0xFFB91C1C.toInt(), 8f, 140f),
        stroke(BrushType.HIGHLIGHTER, InputType.TOUCH, 0xFFFACC15.toInt(), 16f, 190f),
      ),
    ),
  )

  private fun stroke(type: BrushType, input: InputType, color: Int, size: Float, y: Float): DocStroke {
    val stride = DocumentJson.STRIDE
    val points = FloatArray(POINTS * stride) { k ->
      val i = k / stride
      when (k % stride) {
        0 -> 30f + i * 10
        1 -> y + if (i % 2 == 0) 0f else 8f
        2 -> i * 8f
        3 -> if (input == InputType.STYLUS) 0.2f + 0.7f * i / (POINTS - 1) else -1f
        else -> -1f
      }
    }
    return DocStroke(type, color, size, input, points)
  }

  private companion object {
    const val POINTS = 24
    val EMPTY = DocumentJson.write(Doc(320f, 240f, emptyList()))

    val paper: String by lazy {
      val bitmap = Bitmap.createBitmap(4, 4, Bitmap.Config.ARGB_8888).apply { eraseColor(0xFF2E7D32.toInt()) }
      val bytes = ByteArrayOutputStream().use { out ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        out.toByteArray()
      }
      "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
  }
}
