export function rstrip(x:string) {
    return x.replace(/\s+$/gm, '');
}

export function lstrip(x:string) {
    return x.replace(/^\s+/gm, '')
}

export function B64(msg:string):string{
    return Buffer.from(msg).toString('base64')
}

export function fromB64(msg:string):string{
    return Buffer.from(msg, "base64").toString()
}