# 🔴 RedMagicBox

**全球頂級密碼管理工具 · 軍事級加密安全隔離箱**

RedMagicBox 採用 AES-256-CBC + PBKDF2-SHA256 + HMAC-SHA256 三重加密體系，所有運算均在本地完成，用戶數據永遠不會離開設備。

[![Download](https://img.shields.io/badge/Download-APK-e63946?style=for-the-badge)](https://github.com/AHPNFT/RedMagicBox/releases/latest/download/RedMagicBox.apk)
[![License](https://img.shields.io/badge/License-RMPUL-blue?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-green?style=for-the-badge)]()

---

## ✨ 核心功能

### 🛡️ 軍事級加密
- **AES-256-CBC** 對稱加密
- **PBKDF2-SHA256** 100,000 次密鑰推導
- **HMAC-SHA256** 完整性校驗
- **C++ Native SO** 加密引擎（代碼混淆）

### 📂 文件加密/解密
- 支持任意文件和文本內容加密為 `.red` 格式
- 自定義加密文件名
- 加密後可選刪除原文件
- 跨設備解密（RedID + 密碼 + 激活碼）

### 🔍 全盤掃描
- 遞歸掃描設備存儲中所有 `.red` 文件
- 實時顯示掃描進度
- 自動識別文件歸屬 RedID
- 支持解密、文件列表、安全分享三個頁面

### 🔑 激活碼系統
- 解鎖無限次加密
- 參與加密密鑰推導，跨設備解密必備
- 格式：`XXXX-XXXX-XXXX-XXXX`（SHA-256 校驗）
- 區塊鏈智能合約自動生成，鏈上驗證
- 激活碼僅限買家讀取，不公開廣播

### 📤 安全分享
- 系統級分享，支持所有 Android 分享渠道
- 分享時複製到緩存，不暴露原始路徑
- 一鍵生成帶二維碼的分享海報

### 🌍 多語言支持
| 繁體中文 | 簡體中文 | English | 日本語 | 한국어 |
|:---:|:---:|:---:|:---:|:---:|
| zh-TW | zh | en | ja | ko |

---

## 🔐 加密流程

```
原始文件 → Base64編碼 → PBKDF2(RedID+密碼+激活碼, salt, 100000次) → AES-256-CBC加密 → HMAC-SHA256簽名 → .red文件
```

```
.red文件 → HMAC校驗 → PBKDF2(RedID+密碼+激活碼, salt, 100000次) → AES-256-CBC解密 → Base64解碼 → 原始文件
```

---

## 💰 獲取激活碼

| 幣種 | 金額 | 鏈路 |
|------|------|------|
| USDT | 19.9 | BEP-20 (BSC) |
| RMAB | 999 | BEP-20 (BSC) |

**購買頁面**: [https://redmagicbox.pages.dev](https://redmagicbox.pages.dev)

**收款地址**: `0x7E8be446201DEdC881bF9C004B983897621D73bd`

### 🔒 激活碼安全機制
- 智能合約生成激活碼，SHA-256 + 私有種子確保不可偽造
- 事件不包含激活激活碼，僅記錄交易信息
- 激活碼存儲在合約私有 mapping 中，僅買家可通過 `getMyCode()` 讀取
- App 本地驗證 + 鏈上雙重驗證

> ⚠️ 激活碼參與加密，遺失將無法解密文件。洩露激活碼有洩露加密文件的風險。

---

## 📥 下載安裝

[**下載最新版 APK**](https://github.com/AHPNFT/RedMagicBox/releases/latest/download/RedMagicBox.apk)

---

## 🏗️ 技術架構

| 模塊 | 功能 |
|------|------|
| CryptoModule | C++ 加密/解密核心引擎 |
| StoragePermissionModule | Android 11+ 所有文件訪問權限管理 |
| AppChooserModule | 原生應用選擇器 |
| FileOpenerModule | 文件打開功能 |

| 權限 | 用途 |
|------|------|
| MANAGE_EXTERNAL_STORAGE | 全盤掃描 .red 文件（Android 11+） |
| READ_EXTERNAL_STORAGE | 讀取外部存儲文件 |
| WRITE_EXTERNAL_STORAGE | 保存加密文件 |

---

## 📋 版本更新

| 版本 | 更新內容 |
|------|----------|
| 3.9.21 | 激活碼保密：事件不廣播激活碼，改用 getMyCode() 私有讀取 |
| 3.9.20 | 修復激活碼驗證：同步 C++ 與智能合約 seed |
| 3.9.19 | 區塊鏈驗證：激活碼鏈上雙重驗證 |
| 3.9.14 | 加密文件名僅使用自定義名稱 + .red 後綴 |
| 3.9.13 | 更新 App Logo |
| 3.9.12 | 文件列表、安全分享頁面添加全盤掃描 |
| 3.9.11 | 原生 StoragePermission 模塊，修復全盤掃描權限問題 |
| 3.9.10 | 解密頁面添加全盤掃描 .red 文件功能 |

---

## 📄 許可證

本項目採用 [RedMagicBox Personal Use License (RMPUL)](LICENSE) 許可證。

- ✅ 個人免費使用
- ❌ 商業使用需授權

---

<p align="center">
  紅魔團隊匠心打造 · 鏈接來自全球開源社區，請放心下載
</p>
