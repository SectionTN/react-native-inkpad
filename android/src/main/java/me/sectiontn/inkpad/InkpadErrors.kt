package me.sectiontn.inkpad

internal object ErrorCodes {
  const val INVALID_DOCUMENT = "E_INVALID_DOCUMENT"
  const val UNSUPPORTED_VERSION = "E_UNSUPPORTED_VERSION"
  const val EMPTY = "E_EMPTY"
  const val EXPORT_FAILED = "E_EXPORT_FAILED"
  const val NATIVE = "E_NATIVE"
}

internal class InkpadException(val code: String, message: String) : Exception(message)
