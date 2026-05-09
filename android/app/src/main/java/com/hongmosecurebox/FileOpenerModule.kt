package com.hongmosecurebox

import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import androidx.core.content.FileProvider
import java.io.File

class FileOpenerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FileOpener"

  @ReactMethod
  fun openFile(filePath: String, mimeType: String, promise: Promise) {
    try {
      val file = File(filePath)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "文件不存在: $filePath")
        return
      }

      val uri: Uri = FileProvider.getUriForFile(
        reactApplicationContext,
        "${reactApplicationContext.packageName}.fileopener.provider",
        file
      )

      val resolvedMime = if (mimeType.isNullOrEmpty() || mimeType == "application/octet-stream") {
        val ext = file.extension.lowercase()
        MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
      } else {
        mimeType
      }

      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, resolvedMime)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_FAILED", e.message ?: "无法打开文件")
    }
  }
}
