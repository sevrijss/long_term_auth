import SolidFetch from "./solidFetch";

export * from "./solidFetch";

const CSSUrl = "http://localhost:3000"
const podName = "TestPod"
const openResource = `${CSSUrl}/${podName}/profile/card#me`
const lockResource = "https://storage.inrupt.com/416104bb-1f65-45f0-b9ab-13551cf2bb68/private/private.ttl"

const CSSLocked = `http://localhost:3000/${podName}/.acl`

const CSSWebID = `${CSSUrl}/${podName}/profile/card#me`
const inruptWebID = "https://pod.inrupt.com/sevrijss/profile/card#me"

async function main() {
    const sf = new SolidFetch()

    // the localhost pod was a temporary CSS instance running in memory.
    // see the official CSS github to install one

    let data = []

    // 1. inrupt WebID
    // 1.1 unauthenticated fetch over CSS
    // TODO why over CSS?
    data = await sf.fetch(
        openResource,
        inruptWebID)
    if(data.length === 0){
        process.exit(1)
    }
    console.log(data);
    data = [];
    // 1.2 authenticated fetch over inrupt pod
    data = await sf.fetch(
        lockResource,
        inruptWebID)
    if(data.length === 0){
        process.exit(2)
    }
    console.log(data);
    data = [];
    // 1. CSS WebID
    // unauthenticated fetch over CSS
    data = await sf.fetch(
        openResource,
        CSSWebID)
    if(data.length === 0){
        process.exit(3);
    }
    console.log(data);
    data = []
    // authenticated fetch over CSS
    data = await sf.fetch(
        CSSLocked,
        CSSWebID)
    if(data.length === 0){
        process.exit(4);
    }
    console.log(data);
    // TODO what about the other options? authenticated inrupt webId over CSS, and authenticated CSS webID over inrupt pod?
    // Are these important?
}

main().then(e => process.exit(0));