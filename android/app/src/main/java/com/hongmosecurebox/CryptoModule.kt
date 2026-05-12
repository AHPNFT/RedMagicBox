package com.hongmosecurebox

import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

class CryptoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CryptoCore"

    private val PBKDF2_ITERATIONS = 100000
    private val KEY_SIZE_BITS = 256
    private val IV_SIZE_BITS = 128

    private fun insertCipherMagic(cipherBase64: String): String {
        val pos = CryptoNative.getCipherMagicPos()
        val magic = CryptoNative.getCipherMagic()
        return cipherBase64.substring(0, pos) + magic + cipherBase64.substring(pos)
    }

    private fun removeCipherMagic(modified: String): String {
        val pos = CryptoNative.getCipherMagicPos()
        val magic = CryptoNative.getCipherMagic()
        if (modified.length <= pos) {
            throw Exception("DECRYPT_ERR_CIPHER_FORMAT")
        }
        if (modified[pos] != magic) {
            throw Exception("DECRYPT_ERR_TAMPERED")
        }
        return modified.substring(0, pos) + modified.substring(pos + 1)
    }

    private fun generateSalt(fileName: String): String {
        val prefix = CryptoNative.getSaltPrefix()
        val input = prefix + fileName + System.currentTimeMillis()
        val md = MessageDigest.getInstance("SHA-256")
        val hash = md.digest(input.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 32)
    }

    private fun deriveKeyAndIV(password: String, salt: String, activationCode: String?): Pair<ByteArray, ByteArray> {
        val combinedPassword = if (activationCode != null) password + activationCode else password
        val saltBytes = salt.toByteArray(Charsets.UTF_8)
        val spec = PBEKeySpec(combinedPassword.toCharArray(), saltBytes, PBKDF2_ITERATIONS, KEY_SIZE_BITS + IV_SIZE_BITS)
        val factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val derived = factory.generateSecret(spec).encoded

        val keyBytes = derived.copyOfRange(0, KEY_SIZE_BITS / 8)
        val ivBytes = derived.copyOfRange(KEY_SIZE_BITS / 8, (KEY_SIZE_BITS + IV_SIZE_BITS) / 8)

        return Pair(keyBytes, ivBytes)
    }

    private fun hmacSHA256(key: ByteArray, data: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data)
    }

    private fun bytesToHex(bytes: ByteArray): String {
        return bytes.joinToString("") { "%02x".format(it) }
    }

    @ReactMethod
    fun encryptFile(
        plainBase64: String,
        password: String,
        username: String,
        fileName: String,
        meta: ReadableMap?,
        activated: Boolean,
        activationCode: String?,
        promise: Promise
    ) {
        try {
            val salt = generateSalt(fileName)
            val effectiveCode = if (activated && activationCode != null) activationCode else null
            val (keyBytes, ivBytes) = deriveKeyAndIV(password, salt, effectiveCode)

            val cipher = Cipher.getInstance("AES/CBC/PKCS7Padding")
            cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), IvParameterSpec(ivBytes))

            val plainBytes = Base64.decode(plainBase64, Base64.DEFAULT)
            val encryptedBytes = cipher.doFinal(plainBytes)
            val cipherBase64 = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)

            val tamperedCipher = insertCipherMagic(cipherBase64)

            val hmacKeySuffix = CryptoNative.getHmacKeySuffix()
            val hmacKey = hmacSHA256(keyBytes, hmacKeySuffix.toByteArray(Charsets.UTF_8))
            val hmac = hmacSHA256(hmacKey, encryptedBytes)

            val json = JSONObject()
            json.put("s", salt)
            json.put("c", tamperedCipher)
            json.put("h", bytesToHex(hmac))
            json.put("u", username)
            json.put("v", if (effectiveCode != null) 4 else 3)

            if (activated) {
                json.put("a", 1)
            }

            if (meta != null) {
                if (meta.hasKey("op")) json.put("op", meta.getString("op"))
                if (meta.hasKey("mt")) json.put("mt", meta.getString("mt"))
                if (meta.hasKey("ex")) json.put("ex", meta.getString("ex"))
                if (meta.hasKey("fn")) json.put("fn", meta.getString("fn"))
            }

            promise.resolve(json.toString())
        } catch (e: Exception) {
            promise.reject("ENCRYPT_ERR", e.message ?: "ENCRYPT_ERR_FAILED")
        }
    }

    @ReactMethod
    fun decryptFile(
        encryptedJson: String,
        password: String,
        username: String,
        activated: Boolean,
        activationCode: String?,
        promise: Promise
    ) {
        try {
            val payload = JSONObject(encryptedJson)

            if (payload.optString("u") != username) {
                throw Exception("DECRYPT_ERR_USER_MISMATCH")
            }

            if (payload.optInt("a", 0) == 1 && !activated) {
                throw Exception("DECRYPT_ERR_NEED_ACTIVATE")
            }

            val version = payload.optInt("v", 1)
            val salt = payload.getString("s")

            val effectiveCode = if (version >= 4 && payload.optInt("a", 0) == 1 && activationCode != null) activationCode else null
            val (keyBytes, ivBytes) = deriveKeyAndIV(password, salt, effectiveCode)

            val cipherField = payload.getString("c")

            val cipherBase64 = if (version >= 3) {
                removeCipherMagic(cipherField)
            } else {
                cipherField
            }

            val encryptedBytes = Base64.decode(cipherBase64, Base64.DEFAULT)

            val hmacKeySuffix = CryptoNative.getHmacKeySuffix()
            val hmacKey = hmacSHA256(keyBytes, hmacKeySuffix.toByteArray(Charsets.UTF_8))
            val computedHmac = bytesToHex(hmacSHA256(hmacKey, encryptedBytes))

            if (computedHmac != payload.getString("h")) {
                throw Exception("DECRYPT_ERR_HMAC")
            }

            val cipher = Cipher.getInstance("AES/CBC/PKCS7Padding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), IvParameterSpec(ivBytes))

            val decryptedBytes = cipher.doFinal(encryptedBytes)
            val result = Base64.encodeToString(decryptedBytes, Base64.NO_WRAP)

            if (result.isEmpty()) {
                throw Exception("DECRYPT_ERR_FAILED")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DECRYPT_ERR", e.message ?: "DECRYPT_ERR_FAILED")
        }
    }

    @ReactMethod
    fun validateActivationCode(code: String, promise: Promise) {
        try {
            if (code.length != 19) {
                promise.resolve(false)
                return
            }
            if (code[4] != '-' || code[9] != '-' || code[14] != '-') {
                promise.resolve(false)
                return
            }

            val raw = code.replace("-", "")
            if (raw.length != 16) {
                promise.resolve(false)
                return
            }

            for (c in raw) {
                if (!((c in 'A'..'Z') || (c in '0'..'9'))) {
                    promise.resolve(false)
                    return
                }
            }

            val body = raw.substring(0, 12)
            val checksum = raw.substring(12, 16)

            val key = CryptoNative.getActivationKey()
            val salt = CryptoNative.getActivationSalt()
            val message = (body + salt).toByteArray(Charsets.UTF_8)

            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256"))
            val hmacBytes = mac.doFinal(message)

            val hex = hmacBytes.joinToString("") { "%02x".format(it) }.uppercase()
            val computed = hex.substring(0, 4)

            promise.resolve(computed == checksum)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun parseEncryptMeta(encryptedJson: String, promise: Promise) {
        try {
            val payload = JSONObject(encryptedJson)
            val result = com.facebook.react.bridge.Arguments.createMap()
            if (payload.has("op")) result.putString("op", payload.getString("op"))
            if (payload.has("mt")) result.putString("mt", payload.getString("mt"))
            if (payload.has("ex")) result.putString("ex", payload.getString("ex"))
            if (payload.has("fn")) result.putString("fn", payload.getString("fn"))
            promise.resolve(result)
        } catch (e: Exception) {
            val empty = com.facebook.react.bridge.Arguments.createMap()
            promise.resolve(empty)
        }
    }

    @ReactMethod
    fun checkPasswordStrength(password: String, promise: Promise) {
        var score = 0
        if (password.length >= 8) score++
        if (password.length >= 12) score++
        if (password.any { it.isLowerCase() } && password.any { it.isUpperCase() }) score++
        if (password.any { it.isDigit() }) score++
        if (password.any { !it.isLetterOrDigit() }) score++

        val result = when {
            password.length < 6 -> "weak"
            score <= 2 -> "weak"
            score <= 3 -> "medium"
            else -> "strong"
        }
        promise.resolve(result)
    }
}
