package me.sectiontn.inkpad

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class InkpadModule(context: ReactApplicationContext) : NativeInkpadSpec(context) {
  override fun renderImage(documentJson: String, optionsJson: String, promise: Promise) {
    DocumentRenderer.render(reactApplicationContext, documentJson, optionsJson) { result ->
      result.fold(
        onSuccess = promise::resolve,
        onFailure = { error ->
          val code = (error as? InkpadException)?.code ?: ErrorCodes.EXPORT_FAILED
          promise.reject(code, error.message ?: "export failed", error)
        },
      )
    }
  }
}
