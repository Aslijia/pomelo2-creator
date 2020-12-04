declare class Session {
    readonly id: string

    auth(): Promise<any | undefined>

    connect(): Promise<void>
    request(route: string, msg: any): Promise<any>
    notify(route: string, msg: any): Promise<any>

    disconnect(code: number, reason: string): Promise<void>

    when(channel: string, event: string, listener: (...args: any[]) => void): void
    cleanup(channel?: string): void

    on(event: 'error', listener: (...args: any[]) => void): void
    on(event: 'ready', listener: (...args: any[]) => void): void
    on(event: 'disconnect', listener: (...args: any[]) => void): void
    on(event: 'connecting', listener: (...args: any[]) => void): void
    on(event: 'reconnect', listener: (...args: any[]) => void): void
    on(event: 'kickout', listener: (...args: any[]) => void): void
    on(event: 'gone', listener: (...args: any[]) => void): void

    once(event: 'kickout', listener: (...args: any[]) => void): void
    once(event: 'gone', listener: (...args: any[]) => void): void

    emit(event: string, data: any): any
}

declare interface Logger {
    trace(message: string, body?: object): void
    info(message: string, body?: object): void
    debug(message: string, body?: object): void
    warn(message: string, body?: object): void
    error(message: string, body?: object): void
    fatal(message: string, body?: object): void
}

declare interface Option {
    auth(): Promise<object | undefined>

    retry?: number

    localstorage: {
        getItem(key: string): any | undefined
        setItem(key: string, value: any, exipre?: number): any
    }

    decodeIO?: boolean

    rsa?: string
    usr?: object
    logger?: Logger
    cert?: any
}

export namespace pomelo {
    export function create(uri: string, opts: Option): Session
}
