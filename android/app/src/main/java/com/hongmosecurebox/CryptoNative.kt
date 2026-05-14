package com.hongmosecurebox

object CryptoNative {

    init {
        System.loadLibrary("cryptocore")
    }

    external fun getSaltPrefix(): String
    external fun getHmacKeySuffix(): String
    external fun getCipherMagic(): Char
    external fun getCipherMagicPos(): Int
    external fun getActivationKey(): String
    external fun getActivationSalt(): String
    external fun validateActivationCodeV2(code: String): Boolean
}
