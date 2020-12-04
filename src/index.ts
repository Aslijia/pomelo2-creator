import { Session } from './session'

export namespace pomelo {
    export function create(uri: string, opts: any) {
        return new Session(uri, opts)
    }
}
