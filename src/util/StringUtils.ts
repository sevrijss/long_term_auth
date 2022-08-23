export function rstrip(x:string) {
    return x.replace(/\s+$/gm, '');
}

export function lstrip(x:string) {
    return x.replace(/^\s+/gm, '')
}