#include <jni.h>
#include <string>
#include <cstring>

static const unsigned char _K[] = {
    0x32, 0x35, 0x34, 0x3d, 0x37, 0x35, 0x05, 0x3b,
    0x39, 0x2e, 0x05, 0x2c, 0x69, 0x00
};

static const unsigned char _S[] = {
    0x4f, 0x59, 0x5e, 0x4e, 0x59, 0x68, 0x67, 0x4f,
    0x5d, 0x50, 0x58, 0x00
};

static const unsigned char _SP[] = {
    0x47, 0x40, 0x49, 0x48, 0x42, 0x40, 0x70, 0x54,
    0x4e, 0x4c, 0x4a, 0x70, 0x4d, 0x4b, 0x70, 0x00
};

static const unsigned char _HK[] = {
    0x14, 0x33, 0x3e, 0x3a, 0x14, 0x3d, 0x4e, 0x4b,
    0x00
};

static const unsigned char _CM_XOR = 0x79;
static const unsigned char _CP_XOR = 0x02;

static std::string _decode(const unsigned char *data, unsigned char xorKey) {
    std::string result;
    for (int i = 0; data[i] != 0; i++) {
        result += static_cast<char>(data[i] ^ xorKey);
    }
    return result;
}

static char _decodeChar(unsigned char val, unsigned char xorKey) {
    return static_cast<char>(val ^ xorKey);
}

extern "C" {

JNIEXPORT jstring JNICALL
Java_com_hongmosecurebox_CryptoNative_getSaltPrefix(JNIEnv *env, jobject) {
    std::string val = _decode(_SP, 0x2f);
    return env->NewStringUTF(val.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_hongmosecurebox_CryptoNative_getHmacKeySuffix(JNIEnv *env, jobject) {
    std::string val = _decode(_HK, 0x4b);
    return env->NewStringUTF(val.c_str());
}

JNIEXPORT jchar JNICALL
Java_com_hongmosecurebox_CryptoNative_getCipherMagic(JNIEnv *env, jobject) {
    return static_cast<jchar>('r' ^ _CM_XOR ^ _CM_XOR);
}

JNIEXPORT jint JNICALL
Java_com_hongmosecurebox_CryptoNative_getCipherMagicPos(JNIEnv *env, jobject) {
    return static_cast<jint>(3 ^ _CP_XOR ^ _CP_XOR);
}

JNIEXPORT jstring JNICALL
Java_com_hongmosecurebox_CryptoNative_getActivationKey(JNIEnv *env, jobject) {
    std::string val = _decode(_K, 0x5a);
    return env->NewStringUTF(val.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_hongmosecurebox_CryptoNative_getActivationSalt(JNIEnv *env, jobject) {
    std::string val = _decode(_S, 0x3c);
    return env->NewStringUTF(val.c_str());
}

}
