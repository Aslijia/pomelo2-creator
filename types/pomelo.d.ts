
declare class Session {
    readonly id: string;

    auth(): Promise<any | undefined>;

    request(route: string, msg: any): Promise<any>;
    notify(route: string, msg: any): Promise<any>;

    disconnect(code: number, reason: string): Promise<void>;

    when(channel: string, event: string, listener: (...args: any[]) => void): void;
    cleanup(channel?: string): void;

    on(event: 'error', listener: (...args: any[]) => void): void;
    on(event: 'ready', listener: (...args: any[]) => void): void;
    on(event: 'disconnect', listener: (...args: any[]) => void): void;
    on(event: 'reconnect', listener: (...args: any[]) => void): void;
    on(event: 'kickout', listener: (...args: any[]) => void): void;
}
declare interface Option {
    auth(): Promise<object | undefined>;

    retry?: number;

    localstorage: {
        getItem(key: string): any | undefined;
        setItem(key: string, value: any, exipre?: number): any;
    },

    decodeIO?: boolean;

    rsa?: string;
    usr?: object;
}

export namespace pomelo {
    export function create(uri: string, opts: Option): Session;
}