# 合同管理系统 - 本地开发与打包指南

本项目是一个基于 Next.js、Firebase 和 Genkit 的合同管理系统，并已配置 Electron 支持以生成 Windows EXE 文件。

## 1. 环境准备
* 安装 [Node.js](https://nodejs.org/) (推荐 v18+)
* 拥有一个 Firebase 项目（当前代码已内置 Firebase 配置）

## 2. 本地安装与启动
1. **下载并解压**：从 Firebase Studio 下载项目源码并解压。
2. **安装依赖**：
   ```bash
   npm install
   ```
3. **本地预览 (Web)**：
   ```bash
   npm run dev
   ```
   访问 [http://localhost:9002](http://localhost:9002)

## 3. 打包成 EXE 文件 (Windows)
我们使用 Electron 和 `electron-builder` 进行打包：

1. **构建 Next.js 生产环境**：
   ```bash
   npm run build
   ```
2. **打包生成 EXE**：
   ```bash
   npm run electron:build
   ```
3. **获取安装包**：打包完成后，进入项目根目录下的 `dist-electron` 文件夹，即可找到生成的 `.exe` 安装程序。

## 4. 注意事项
* **线上同步**：本系统依赖 Firebase 云端数据库，打包后的 EXE 运行仍需联网以同步合同数据。
* **管理员权限**：系统唯一管理员为 `hening300@gmail.com`。
* **环境变量**：如果使用了 Genkit AI 功能，请在本地根目录创建 `.env` 文件并填入 `GOOGLE_GENAI_API_KEY`。

---
由 Firebase Studio 自动化构建。