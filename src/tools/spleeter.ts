import { Context, Logger, Session } from "koishi";
import { Config } from "../config";
import { FileAttributes } from "../type";

// spleeter web常规请求接口，获取整体信息
interface Track {
    id: string;
    url: string;
    artist: string;
    title: string;
    dynamic: DynamicTrack[];
    static: StaticTrack[];
    fetch_task_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | null;
    fetch_task_error: string | null;
    date_created: string; // 或者使用 Date 类型
    fetch_task_date_finished: string | null; // 或者使用 Date 类型
}
interface DynamicTrack {
    id: string;
    source_track: string;
    separator: 'htdemucs' | 'htdemucs_ft' | 'spleeter_5stems' | string; // 已知的分隔器
    bitrate: number;
    extra_info: string[];
    artist: string;
    title: string;
    vocals_url: string;
    other_url: string;
    piano_url: string;
    bass_url: string;
    drums_url: string;
    status: 'In Progress' | 'Done' | string;
    error: string;
    date_created: string;
    date_finished: string;
}
interface StaticTrack {
    id: string;
    source_track: string;
    separator: string;
    extra_info: string[];
    artist: string;
    title: string;
    vocals: boolean;
    drums: boolean;
    bass: boolean;
    other: boolean;
    piano: boolean;
    status: 'In Progress' | 'Done' | string; // 使用联合类型，string 作为后备
    url: string;
    error: string;
    date_created: string; // 或者使用 Date 类型，但需要转换
    date_finished: string | null; // 或者使用 Date | null 类型，但需要转换
}

interface UploadResponse {
    id: string;
    source_file: string;
    url: string;
    artist: string;
    title: string;
    static: StaticTrack[];
    dynamic: DynamicTrack[];
    is_youtube: boolean;
    youtube_link: string | null;
    fetch_task_status: string | null;
    fetch_task_error: string | null;
    date_created: string;
    fetch_task_date_finished: string | null;
}

export interface requestBody {
    source_track: string,
    separator: "htdemucs_ft" | "htdemucs",
    separator_args: {
        random_shifts: number,
        iterations: 1,
        softmask: boolean,
        alpha: number
    },
    bitrate: 1|192|256|320,
    vocals: boolean,
    drums: boolean,
    bass: boolean,
    other: boolean,
    piano: boolean
}

export class Spleeter {

    ctx: Context
    cfg: Config
    logger: Logger

    constructor(ctx: Context, config: Config, logger: Logger) {
        this.ctx = ctx
        this.cfg = config
        this.logger = logger
    }

    async source(): Promise<Track[]> {
        const tracks: Track[] = await this.ctx.http.get(this.cfg.api + '/api/source-track')
        return tracks
    }

    async upload(session: Session, file: FileAttributes): Promise<UploadResponse | string> {
        try {
            const fileContent = await this.ctx.http.get<ArrayBuffer>(file.src)
            console.log('=====开始上传=====')
            const formData = new FormData()
            const blob = new Blob([fileContent], { type: 'audio/flac' })
            formData.append('file', blob, file.file || 'audio.flac')

            const res: {
                file_id: string;
                artist: string;
                title: string;
            } = await this.ctx.http.post(this.cfg.api + '/api/source-file/file/', formData, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            console.log('=====上传完成准备重命名=====')
            // 上传成功后，重命名文件
            const fileInfo = {
                "source_file": res.file_id,
                "artist": 'koishi',
                "title": session.userId,
            }
            const renameRes: UploadResponse = await this.ctx.http.post(this.cfg.api + '/api/source-track/file/', JSON.stringify(fileInfo), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            console.log('=====重命名完成=====')
            return renameRes
        } catch (error) {
            this.logger.error(`上传文件${file.file}失败，错误信息：${error}`)
            await this.delete(session.userId)
            return '上传失败'
        }

    }

    async staticMix(requestBody: requestBody) {
        try {
            const res = await this.ctx.http.post(this.cfg.api + '/api/mix/static/', JSON.stringify(requestBody), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            return res
        } catch (error) {
            this.logger.error(`创建${requestBody.source_track}静态混合任务失败，错误信息：${error}`)
            return '静态混合创建失败'
        }
    }

    async staticMixStatus(userId: string): Promise<StaticTrack | null | undefined> {
        try {
            const tracks: Track[] = await this.source()
            const track = tracks.find(track => track.title === userId)
            if (!track) {
                return null
            }
            return track.static[0]
        } catch (error) {
            this.logger.error(`查询用户${userId}的静态混合状态失败，错误信息：${error}`)
            return undefined
        }
    }

    async delete(userId: string) {
        try {
            const tracks: Track[] = await this.source()
            const track = tracks.find(track => track.title === userId)
            if (!track) {
                return null
            }
            await this.ctx.http.delete(this.cfg.api + '/api/source-track/' + track.id)
        } catch (error) {
            this.logger.error(`删除用户${userId}的静态混合文件失败，错误信息：${error}`)
            return error
        }
    }
}