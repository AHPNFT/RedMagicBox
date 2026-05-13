# 🔴 RedMagicBox

**全球顶级密码管理工具 · 军事级加密安全隔离箱**

RedMagicBox 采用 AES-256-CBC + PBKDF2-SHA256 + HMAC-SHA256 三重加密体系，所有运算均在本地完成，用户数据永远不会离开设备。

[![Download](https://img.shields.io/badge/Download-APK-e63946?style=for-the-badge)](https://github.com/AHPNFT/RedMagicBox/releases/latest/download/RedMagicBox.apk)
[![License](https://img.shields.io/badge/License-RMPUL-blue?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-green?style=for-the-badge)]()

---

## ✨ 核心功能

### 🛡️ 军事级加密
- **AES-256-CBC** 对称加密
- **PBKDF2-SHA256** 100,000 次密钥推导
- **HMAC-SHA256** 完整性校验
- **C++ Native SO** 加密引擎（代码混淆）

### 📂 文件加密/解密
- 支持任意文件和文本内容加密为 `.red` 格式
- 自定义加密文件名
- 加密后可选删除原文件
- 跨设备解密（RedID + 密码 + 激活码）

### 🔍 全盘扫描
- 递归扫描设备存储中所有 `.red` 文件
- 实时显示扫描进度
- 自动识别文件归属 RedID
- 支持解密、文件列表、安全分享三个页面

### 🔑 激活码系统
- 解锁无限次加密
- 参与加密密钥推导，跨设备解密必备
- 格式：`XXXX-XXXX-XXXX-XXXX`（HMAC-SHA256 校验）
- 在线购买自动获取激活码

### 📤 安全分享
- 系统级分享，支持所有 Android 分享渠道
- 分享时复制到缓存，不暴露原始路径
- 一键生成带二维码的分享海报

### 🌍 多语言支持
| 繁體中文 | 簡體中文 | English | 日本語 | 한국어 |
|:---:|:---:|:---:|:---:|:---:|
| zh-TW | zh | en | ja | ko |

---

## 🔐 加密流程

```
原始文件 → Base64编码 → PBKDF2(RedID+密码+激活码, salt, 100000次) → AES-256-CBC加密 → HMAC-SHA256签名 → .red文件
```

```
.red文件 → HMAC校验 → PBKDF2(RedID+密码+激活码, salt, 100000次) → AES-256-CBC解密 → Base64解码 → 原始文件
```

---

## 💰 获取激活码

| 币种 | 金额 | 链路 |
|------|------|------|
| USDT | 9.9 | BEP-20 (BSC) |
| RMAB | 999 | BEP-20 (BSC) |

**收款地址**: `0x7E8be446201DEdC881bF9C004B983897621D73bd`

> ⚠️ 激活码参与加密，遗失将无法解密文件。泄露激活码有泄露加密文件的风险。

---

## 📥 下载安装

[**下载最新版 APK**](https://github.com/AHPNFT/RedMagicBox/releases/latest/download/RedMagicBox.apk)

---

## 🏗️ 技术架构

| 模块 | 功能 |
|------|------|
| CryptoModule | C++ 加密/解密核心引擎 |
| StoragePermissionModule | Android 11+ 所有文件访问权限管理 |
| AppChooserModule | 原生应用选择器 |
| FileOpenerModule | 文件打开功能 |

| 权限 | 用途 |
|------|------|
| MANAGE_EXTERNAL_STORAGE | 全盘扫描 .red 文件（Android 11+） |
| READ_EXTERNAL_STORAGE | 读取外部存储文件 |
| WRITE_EXTERNAL_STORAGE | 保存加密文件 |

---

## 📋 版本更新

| 版本 | 更新内容 |
|------|----------|
| 3.9.14 | 加密文件名仅使用自定义名称 + .red 后缀 |
| 3.9.13 | 更新 App Logo |
| 3.9.12 | 文件列表、安全分享页面添加全盘扫描 |
| 3.9.11 | 原生 StoragePermission 模块，修复全盘扫描权限问题 |
| 3.9.10 | 解密页面添加全盘扫描 .red 文件功能 |

---

## 📄 许可证

本项目采用 [RedMagicBox Personal Use License (RMPUL)](LICENSE) 许可证。

- ✅ 个人免费使用
- ❌ 商业使用需授权

---

<p align="center">
  红魔团队匠心打造 · 链接来自全球开源社区，请放心下载
</p>
