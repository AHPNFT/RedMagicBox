package com.hongmosecurebox

import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import org.json.JSONObject
import org.json.JSONArray
import java.net.URL
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

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
            val v2Result = CryptoNative.validateActivationCodeV2(code)
            if (v2Result) {
                promise.resolve(true)
                return
            }

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

    companion object {
        private const val MAINNET_RPC = "https://bsc.publicnode.com"
        private const val TESTNET_RPC = "https://bsc-testnet-rpc.publicnode.com"

        private const val MAINNET_CONTRACT = "0x224C8F36b6bf5f7EA3E8D61ef9e06d995B540f71"
        private const val TESTNET_CONTRACT = "0x84BB41Eb7eBf3b78E47626ec54595f9235dC41bD"

        private const val FUNC_IS_CODE_REGISTERED = "0xa4f2d72b"
        private const val FUNC_BNB_PRICE = "0x42966c68"
        private const val FUNC_GET_ACTIVATION_CODE = "0x2d0d2373"
        private const val FUNC_GET_ALL_TOKENS = "0x624d3c5c"
        private const val FUNC_TOKEN_PRICES = "0x3a98ef39"
        private const val FUNC_SUPPORTED = "0x3f4ba83a"
    }

    private fun ethCall(rpcUrl: String, contractAddress: String, data: String): String? {
        return try {
            val jsonBody = """{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"$contractAddress","data":"$data"},"latest"],"id":1}"""
            val connection = URL(rpcUrl).openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.outputStream.use { os ->
                os.write(jsonBody.toByteArray(Charsets.UTF_8))
            }
            val response = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            val jsonResponse = JSONObject(response)
            val result = jsonResponse.optString("result", "0x")
            if (result == "0x" || result == "0x0000000000000000000000000000000000000000000000000000000000000000") null else result
        } catch (_: Exception) {
            null
        }
    }

    private fun ethCallWithFallback(data: String): String? {
        val mainnetResult = ethCall(MAINNET_RPC, MAINNET_CONTRACT, data)
        if (mainnetResult != null) return mainnetResult
        return ethCall(TESTNET_RPC, TESTNET_CONTRACT, data)
    }

    @ReactMethod
    fun verifyActivationCodeOnChain(code: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (code.length != 19) {
                    promise.resolve("invalid_format")
                    return@launch
                }

                val raw = code.replace("-", "")
                if (raw.length != 16) {
                    promise.resolve("invalid_format")
                    return@launch
                }

                val body = raw.substring(0, 12)
                val bodyBytes = body.toByteArray(Charsets.UTF_8)
                val bodyHex = bodyBytes.joinToString("") { String.format("%02x", it) }
                val bodyPadded = bodyHex.padEnd(64, '0')
                val data = FUNC_IS_CODE_REGISTERED + bodyPadded

                val result = ethCallWithFallback(data)
                if (result != null) {
                    promise.resolve("verified")
                } else {
                    promise.resolve("not_found")
                }
            } catch (e: Exception) {
                promise.resolve("network_error")
            }
        }
    }

    @ReactMethod
    fun getPaymentInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val info = Arguments.createMap()

                val bnbPriceData = ethCallWithFallback(FUNC_BNB_PRICE)
                if (bnbPriceData != null) {
                    val bnbPriceWei = bnbPriceData.removePrefix("0x").toBigInteger(16)
                    val bnbPriceBnb = bnbPriceWei.toDouble() / 1e18
                    info.putDouble("bnbPrice", bnbPriceBnb)
                }

                val tokensResult = Arguments.createArray()
                val tokenAddresses = listOf(
                    "0x55d398326f99059fF775485246999027B3197955",
                    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
                    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
                )
                val tokenSymbols = listOf("USDT", "BUSD", "USDC")
                val tokenDecimals = listOf(18, 18, 18)

                for (i in tokenAddresses.indices) {
                    val addr = tokenAddresses[i].removePrefix("0x").lowercase()
                    val addrPadded = addr.padEnd(64, '0')

                    val supportedData = ethCallWithFallback(FUNC_SUPPORTED + addrPadded)
                    val isSupported = supportedData != null && supportedData.removePrefix("0x").takeLast(64).takeLast(1) == "1"

                    if (isSupported) {
                        val priceData = ethCallWithFallback(FUNC_TOKEN_PRICES + addrPadded)
                        val tokenInfo = Arguments.createMap()
                        tokenInfo.putString("address", tokenAddresses[i])
                        tokenInfo.putString("symbol", tokenSymbols[i])
                        tokenInfo.putInt("decimals", tokenDecimals[i])
                        if (priceData != null) {
                            val priceRaw = priceData.removePrefix("0x").toBigInteger(16)
                            val priceHuman = priceRaw.toDouble() / Math.pow(10.0, tokenDecimals[i].toDouble())
                            tokenInfo.putDouble("price", priceHuman)
                        }
                        tokensResult.pushMap(tokenInfo)
                    }
                }

                info.putArray("tokens", tokensResult)
                info.putString("contractAddress", MAINNET_CONTRACT)
                info.putString("adminWallet", "0x7E8be446201DEdC881bF9C004B983897621D73bd")
                promise.resolve(info)
            } catch (e: Exception) {
                promise.reject("PAYMENT_INFO_ERR", e.message ?: "Failed to get payment info")
            }
        }
    }

    @ReactMethod
    fun getActivationCodeByBuyer(buyerAddress: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val addr = buyerAddress.removePrefix("0x").lowercase()
                val addrPadded = addr.padEnd(64, '0')
                val data = FUNC_GET_ACTIVATION_CODE + addrPadded

                val result = ethCallWithFallback(data)
                if (result != null) {
                    val hexStr = result.removePrefix("0x")
                    val offset = hexStr.substring(0, 64).toLong(16) * 2
                    val length = hexStr.substring(offset.toInt(), offset.toInt() + 64).toLong(16) * 2
                    if (length > 0) {
                        val codeHex = hexStr.substring(offset.toInt() + 64, offset.toInt() + 64 + length.toInt())
                        val code = codeHex.chunked(2).map { it.toInt(16).toChar() }.joinToString("")
                        promise.resolve(code.trimEnd('\u0000'))
                    } else {
                        promise.resolve(null)
                    }
                } else {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }
}
