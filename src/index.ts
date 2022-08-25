import SolidFetch, {INRUPT} from "./solidFetch";

async function main() {
    const sf = new SolidFetch()
    let data = await sf.fetch(INRUPT,
        "http://localhost:3000/age",
        "https://pod.inrupt.com/sevrijss/profile/card#me")
    console.log(data);
    data = await sf.fetch(INRUPT,
        "https://storage.inrupt.com/416104bb-1f65-45f0-b9ab-13551cf2bb68/private/chatrooms.ttl",
        "https://pod.inrupt.com/sevrijss/profile/card#me")
    console.log(data);
}

main().then(e => process.exit(0));