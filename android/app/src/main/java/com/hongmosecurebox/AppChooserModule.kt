package com.hongmosecurebox

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppChooserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppChooser"

    @ReactMethod
    fun openWith(url: String) {
        val activity = currentActivity ?: return
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            val chooser = Intent.createChooser(intent, "選擇應用程式打開")
            activity.startActivity(chooser)
        } catch (e: Exception) {
            Toast.makeText(activity, "無法打開", Toast.LENGTH_SHORT).show()
        }
    }
}
