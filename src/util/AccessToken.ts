import {KeyPair} from "@inrupt/solid-client-authn-core";

export class Token{

    private calculateExpiration(seconds: number) {
        return new Date(Date.now() + (seconds * 1000));
    }

    public isExpired() {
        return Date.now() > this.expirationDate.getDate()
    }

    private readonly _value;
    private readonly expirationDate:Date;
    private readonly _key;
    constructor(token:string, expiration:number, key:KeyPair) {
        this._value = token;
        this._key = key;
        this.expirationDate = this.calculateExpiration(expiration);
    }


    public value() {
        return this._value;
    }

    public key() {
        return this._key;
    }
}