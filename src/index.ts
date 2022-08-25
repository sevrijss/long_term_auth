import SolidFetch from "./solidFetch";

export * from "./solidFetch";

async function main() {
    const sf = new SolidFetch()
    // unauthenticated fetch
    let data = await sf.fetch(
        "http://localhost:3000/TestPod/profile/card#me",
        "https://pod.inrupt.com/sevrijss/profile/card#me")
    console.log(data);
    // authenticated fetch
    data = await sf.fetch(
        "https://storage.inrupt.com/416104bb-1f65-45f0-b9ab-13551cf2bb68/private/chatrooms.ttl",
        "https://pod.inrupt.com/sevrijss/profile/card#me")
    console.log(data);

    // unauthenticated fetch
    data = await sf.fetch(
        "http://localhost:3000/TestPod/profile/card#me",
        "http://localhost:3000/TestPod/profile/card#me")
    console.log(data);

    // authenticated fetch
    data = await sf.fetch(
        "http://localhost:3000/TestPod/.acl",
        "http://localhost:3000/TestPod/profile/card#me")
    console.log(data);
}

main().then(e => process.exit(0));