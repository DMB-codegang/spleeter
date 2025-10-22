import { Bot, Context, Logger, Session } from 'koishi'

export const name = 'spleeter'

import { Config } from './config'
import { parseFileAttributes } from './tools/qouteFile'
import { requestBody, Spleeter } from './tools/spleeter'
export * from './config'

export function apply(ctx: Context, config: Config, bot: Bot) {

  const logger = ctx.logger('spleeter')
  const spleeter = new Spleeter(ctx, config, logger)
  const userLocks: Array<string> = []

  ctx.command('取伴奏')
    .action(async ({ session }) => {
      await separate(ctx, session, 'withoutVocals', spleeter, userLocks, logger, config)
    })

  ctx.command('去伴奏')
    .action(async ({ session }) => {
      await separate(ctx, session, 'onlyVocals', spleeter, userLocks, logger, config)
    })

  ctx.command('取伴奏状态')
    .action(async ({ session }) => {
      if (userLocks.includes(session.userId)) {
        const status = await spleeter.staticMixStatus(session.userId)
        if (status === null || status === undefined || status.status === null || status.status === undefined) {
          return '您的分离任务正在上传服务器'
        }
        if (status.status === 'In Progress') {
          return `您的分离任务正在处理`
        } else {
          return `您的分离任务正在排队`
        }
      }
      return '您没有正在进行的分离任务'
    })

}

// 通用分离流程
async function separate(ctx: Context, session: Session, type: 'withoutVocals' | 'onlyVocals', spleeter: Spleeter, userLocks: Array<string>, logger: Logger, config: Config) {
  let messageID: string[]
  let status: any
  try {
    status = await spleeter.staticMixStatus(session.userId)
    if (status !== null || userLocks.includes(session.userId)) {
      logger.info(`用户${session.userId}有一个任务正在进行,新请求被拒绝`)
      return '您有一个任务正在进行，请稍后再试'
    }
  } catch (error) {
    logger.error(`用户${session.userId}的请求失败，错误信息：${error}`)
    return '请求失败，请稍后再试'
  }
  messageID = await session.send(`正在下载您的文件`)
  userLocks.push(session.userId)
  const quote = session.event.message.quote.content
  // console.log(quote)
  const file = parseFileAttributes(quote)
  if (typeof file === 'string') {
    return file
  }
  logger.info(`用户${session.userId}引用了文件${file.file}`)
  // await bot.deleteMessage(session.channelId, messageID[0])
  // messageID = await session.send(`文件正在上传至后端`)
  const uploadRes = await spleeter.upload(session, file)
  if (typeof uploadRes === 'string') {
    await spleeter.delete(session.userId)
    userLocks.splice(userLocks.indexOf(session.userId), 1)
    return uploadRes
  }

  let bitrate: requestBody = {
    source_track: uploadRes.id,
    separator: "htdemucs_ft",
    separator_args: {
      random_shifts: 6,
      iterations: 1,
      softmask: false,
      alpha: 1
    },
    bitrate: config.bitrate,
    vocals: false,
    drums: false,
    bass: false,
    other: false,
    piano: false
  }

  switch (type) {
    case 'withoutVocals':
      bitrate.drums = true
      bitrate.bass = true
      bitrate.other = true
      break
    case 'onlyVocals':
      bitrate.vocals = true
      break
  }

  await spleeter.staticMix(bitrate)
  logger.info(`分离任务已提交，任务ID：${uploadRes.id}`)
  // await bot.deleteMessage(session.channelId, messageID[0])
  await session.send(`分离任务已创建，大概需要5-10分钟进行计算，请您耐心等候`)

  const time = Date.now()
  do {
    status = await spleeter.staticMixStatus(session.userId)
    await ctx.sleep(config.awaitTime)
  } while (!(status.status === 'Done' || Date.now() - time > config.timeout * 1000))

  if (status.status === 'Done') {
    logger.info(`用户${session.userId}的分离任务${uploadRes.id}已完成`)
    // 发送文件
    const fileName = file.file.split('.')[0]
    await session.send(`<file title="${fileName}-${type === 'withoutVocals' ? '伴奏' : '人声'}.${config.bitrate == 1 ? 'flac' : 'mp3'}" src="${config.api + status.url}"/>`)
  } else {
    logger.error(`用户${session.userId}的分离任务${uploadRes.id}失败，状态为${status.status}`)
    await session.send(`分离任务${uploadRes.id}失败，状态为${status.status}`)
  }

  // 删除文件
  spleeter.delete(session.userId)
  logger.info(`用户${session.userId}的静态混合文件已删除`)
  userLocks.splice(userLocks.indexOf(session.userId), 1)
}