# koishi-plugin-spleeter

[![npm](https://img.shields.io/npm/v/koishi-plugin-spleeter?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-spleeter)

一个将音频的人声与伴奏分离的 Koishi 插件，后端依赖 [spleeter-web](https://github.com/JeffreyCA/spleeter-web)。

## 使用

1. 在聊天中引用一个音频文件
2. 发送命令：`spleeter`
3. 插件会自动下载文件并提交到 Spleeter Web 后端进行处理
4. 处理完成后会返回分离后的伴奏文件

## 许可证

MIT License