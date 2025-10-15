import { FileAttributes } from "../type";

export function parseFileAttributes(inputString: string): FileAttributes | string {
    if (!inputString || typeof inputString !== 'string') {
        return '没有引用消息';
    }

    // 检查字符串是否包含必要的属性
    const requiredAttributes = ['src', 'file', 'file-id', 'file-size'];
    const missingAttributes = requiredAttributes.filter(attr =>
        !inputString.includes(`${attr}=`)
    );

    if (missingAttributes.length > 0) {
        return `缺少必要属性: ${missingAttributes.join(', ')}`;
    }

    try {
        // 使用正则表达式提取属性
        const srcMatch = inputString.match(/src="([^"]*)"/);
        const fileMatch = inputString.match(/file="([^"]*)"/);
        const fileIdMatch = inputString.match(/file-id="([^"]*)"/);
        const fileSizeMatch = inputString.match(/file-size="([^"]*)"/);

        // 检查是否成功提取所有属性
        if (!srcMatch || !fileMatch || !fileIdMatch || !fileSizeMatch) {
            return '提取文件属性时出错';
        }

        return {
            src: srcMatch[1],
            file: fileMatch[1],
            fileId: fileIdMatch[1],
            fileSize: parseInt(fileSizeMatch[1], 10),
        };
    } catch (error) {
        return '解析文件属性时出错';
    }

}