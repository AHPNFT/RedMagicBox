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

static const unsigned char _SS[] = {
    0x5e, 0x58, 0x4c, 0x5a, 0x4a, 0x4c, 0x1b, 0x56,
    0x4e, 0x5d, 0x1b, 0x47, 0x5d, 0x5a, 0x4c, 0x5e,
    0x5f, 0x5a, 0x00
};

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

static const char CHARS[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

static void sha256(const unsigned char *data, size_t len, unsigned char out[32]) {
    unsigned int W[64];
    unsigned int a, b, c, d, e, f, g, h;
    unsigned int T1, T2;
    unsigned int H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
    unsigned int H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

    static const unsigned int K[64] = {
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    };

    size_t totalLen = len + 1 + 9;
    size_t padLen = ((56 - (totalLen % 64)) + 64) % 64;
    size_t blockCount = (totalLen + padLen) / 64;

    unsigned char *padded = new unsigned char[blockCount * 64];
    memset(padded, 0, blockCount * 64);
    memcpy(padded, data, len);
    padded[len] = 0x80;
    unsigned long long bitLen = (unsigned long long)len * 8;
    for (int i = 0; i < 8; i++) {
        padded[blockCount * 64 - 1 - i] = (unsigned char)(bitLen >> (i * 8));
    }

    for (size_t block = 0; block < blockCount; block++) {
        for (int i = 0; i < 16; i++) {
            W[i] = ((unsigned int)padded[block * 64 + i * 4] << 24) |
                    ((unsigned int)padded[block * 64 + i * 4 + 1] << 16) |
                    ((unsigned int)padded[block * 64 + i * 4 + 2] << 8) |
                    ((unsigned int)padded[block * 64 + i * 4 + 3]);
        }
        for (int i = 16; i < 64; i++) {
            unsigned int s0 = ((W[i-15] >> 7) | (W[i-15] << 25)) ^ ((W[i-15] >> 18) | (W[i-15] << 14)) ^ (W[i-15] >> 3);
            unsigned int s1 = ((W[i-2] >> 17) | (W[i-2] << 15)) ^ ((W[i-2] >> 19) | (W[i-2] << 13)) ^ (W[i-2] >> 10);
            W[i] = W[i-16] + s0 + W[i-7] + s1;
        }

        a = H0; b = H1; c = H2; d = H3; e = H4; f = H5; g = H6; h = H7;

        for (int i = 0; i < 64; i++) {
            unsigned int S1 = ((e >> 6) | (e << 26)) ^ ((e >> 11) | (e << 21)) ^ ((e >> 25) | (e << 7));
            unsigned int ch = (e & f) ^ (~e & g);
            T1 = h + S1 + ch + K[i] + W[i];
            unsigned int S0 = ((a >> 2) | (a << 30)) ^ ((a >> 13) | (a << 19)) ^ ((a >> 22) | (a << 10));
            unsigned int maj = (a & b) ^ (a & c) ^ (b & c);
            T2 = S0 + maj;
            h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
        }

        H0 += a; H1 += b; H2 += c; H3 += d; H4 += e; H5 += f; H6 += g; H7 += h;
    }

    delete[] padded;

    unsigned int H[8] = {H0, H1, H2, H3, H4, H5, H6, H7};
    for (int i = 0; i < 8; i++) {
        out[i * 4] = (H[i] >> 24) & 0xff;
        out[i * 4 + 1] = (H[i] >> 16) & 0xff;
        out[i * 4 + 2] = (H[i] >> 8) & 0xff;
        out[i * 4 + 3] = H[i] & 0xff;
    }
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

JNIEXPORT jboolean JNICALL
Java_com_hongmosecurebox_CryptoNative_validateActivationCodeV2(JNIEnv *env, jobject, jstring code) {
    if (!code) return JNI_FALSE;

    const char *codeStr = env->GetStringUTFChars(code, nullptr);
    if (!codeStr) return JNI_FALSE;

    int len = strlen(codeStr);
    if (len != 19) {
        env->ReleaseStringUTFChars(code, codeStr);
        return JNI_FALSE;
    }
    if (codeStr[4] != '-' || codeStr[9] != '-' || codeStr[14] != '-') {
        env->ReleaseStringUTFChars(code, codeStr);
        return JNI_FALSE;
    }

    char raw[17] = {0};
    int pos = 0;
    for (int i = 0; i < 19 && pos < 16; i++) {
        if (codeStr[i] != '-') {
            char c = codeStr[i];
            if (!((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))) {
                env->ReleaseStringUTFChars(code, codeStr);
                return JNI_FALSE;
            }
            raw[pos++] = c;
        }
    }
    env->ReleaseStringUTFChars(code, codeStr);

    if (pos != 16) return JNI_FALSE;

    char body[13] = {0};
    char checksum[5] = {0};
    memcpy(body, raw, 12);
    memcpy(checksum, raw + 12, 4);

    std::string seedStr = _decode(_SS, 0x1a);

    unsigned char seedPadded[32];
    memset(seedPadded, 0, 32);
    memcpy(seedPadded, seedStr.c_str(), seedStr.length());

    unsigned char hashInput[44];
    memcpy(hashInput, seedPadded, 32);
    memcpy(hashInput + 32, body, 12);

    unsigned char hashOut[32];
    sha256(hashInput, 44, hashOut);

    char computed[5] = {0};
    for (int i = 0; i < 4; i++) {
        computed[i] = CHARS[hashOut[i] % 36];
    }

    return (memcmp(computed, checksum, 4) == 0) ? JNI_TRUE : JNI_FALSE;
}

}
