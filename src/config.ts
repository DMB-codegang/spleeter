import { Schema } from 'koishi'

export interface Config {
    api: string
    awaitTime: number
    timeout: number
    // 音质配置，1为flac，192，256，320为mp3
    bitrate: 1|192|256|320,
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        api: Schema.string().description('Spleeter 地址，点击 [*这里*](https://github.com/JeffreyCA/spleeter-web) 查看部署方法').default('http://localhost:8000'),
        awaitTime: Schema.number().description('静态混合任务查询间隔，单位毫秒').default(1500),
        timeout: Schema.number().description('静态混合任务超时时间，单位秒').default(1200),
        bitrate: Schema.union([
            Schema.const(1).description('FLAC'),
            Schema.const(192).description('MP3 128kbps'),
            Schema.const(256).description('MP3 256kbps'),
            Schema.const(320).description('MP3 320kbps')
        ]).default(1).description('音频与格式配置')
    }),

])