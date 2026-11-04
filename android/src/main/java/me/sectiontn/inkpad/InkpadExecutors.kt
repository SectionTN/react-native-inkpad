package me.sectiontn.inkpad

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

internal object InkpadExecutors {
  // Saves and loads documents. Exports have their own thread, since they can wait on the background image.
  val worker: ExecutorService = Executors.newSingleThreadExecutor()
  val exporter: ExecutorService = Executors.newSingleThreadExecutor()
  val loader: ExecutorService = Executors.newCachedThreadPool()

  // Runs renderImage jobs one at a time, background load included, so a list of thumbnails holds one image at once.
  val renderer: ExecutorService = Executors.newSingleThreadExecutor()
}
