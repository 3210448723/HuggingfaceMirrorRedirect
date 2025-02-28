# HuggingFace 镜像重定向助手

`HuggingFace 镜像重定向助手` 是一个专为 `HuggingFace` 提供国内镜像加速的油猴脚本。它能够自动将 `huggingface.co` 的相关页面重定向到对应的国内镜像站（如 `hf-mirror.com`），并自动替换页面中显示的 `huggingface.co` 为镜像站地址。

## 功能亮点

1. **自动重定向**：一键开启，自动将 `huggingface.co` 页面重定向至镜像站。
2. **内容替换**：监听页面动态变化，自动替换页面中显示的 `huggingface.co` 和相关的超链接。
3. **镜像源健康检查**：自动检测镜像站是否可用，确保稳定的访问体验。
4. **可视化操作面板**：提供可视化面板，方便用户进行手动操作和配置管理。
5. **配置管理**：支持自定义镜像源、白名单、正则匹配规则等，满足个性化需求。
6. **持久化配置**：配置信息将被自动保存，方便下次使用。

## 如何使用

1. 安装 `Tampermonkey` 或其他支持用户脚本的扩展。
2. 将此脚本复制并粘贴到 `Tampermonkey` 中。
3. 根据需求进行配置并启用脚本。

## 设置界面

### 打开插件设置界面
![打开插件设置界面](https://github.com/user-attachments/assets/0b50328e-bcef-43f2-a5aa-53b73309c911)

### 功能栏
![功能栏](https://github.com/user-attachments/assets/ba48aa19-6ced-4c32-8454-16c9e17da1b7)

### 设置栏
![设置栏](https://github.com/user-attachments/assets/05dec3af-0c01-41d2-a09b-e1772251acd4)
