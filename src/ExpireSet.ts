export class ExpireSet<K> {

    private map: ExpireMap<K, number>;

    constructor(ttlSeconds : number) {
        this.map = new ExpireMap<K, number>(ttlSeconds);
    }

    has(key : K) : boolean {
        return this.map.has(key);
    }

    insert(key : K) : void {
        return this.map.insert(key, 1);
    }
}

export class ExpireMap<K, V> {
    private readonly ttl: number;
    private cur: Map<K, ExpireMapContainer<V>>;
    private prev: Map<K, ExpireMapContainer<V>>;

    private lastUpdate: number;

    constructor(ttlSeconds : number) {
        this.ttl = ttlSeconds;
        this.cur = new Map<K, ExpireMapContainer<V>>();
        this.prev = new Map<K, ExpireMapContainer<V>>();
        this.lastUpdate = + new Date() / 1000 | 0;
    }

    private lookup(key: K): V | undefined {
        const now = this.updateIfNeeded();

        const curVal = this.cur.get(key);
        if (curVal) {
            return curVal.value;
        }

        const prevVal = this.prev.get(key);
        if (prevVal) {
            const ttl = prevVal.expireTime - now;
            if (ttl >= 0) {
                return prevVal.value;
            }
        }

        return undefined;
    }

    private updateIfNeeded(): number {
        // TODO find a way to get a monotonic clock in node ? Use that instead of system time to provide robustness in the face of time changes
        const now = + new Date() / 1000 | 0;
        const diff = Math.max(0, now - this.lastUpdate);

        if (diff > this.ttl) {
            // Rotate
            if (diff <= 2 * this.ttl) {
                this.prev = this.cur;
                this.cur = new Map();
            }
            // Double rotate
            else {
                this.prev = new Map();
                this.cur = new Map();
            }

            this.lastUpdate = now;
        }

        return now;
    }

    get(key: K): V | undefined {
        return this.lookup(key);
    }

    has(key: K): boolean {

        const found = this.lookup(key);
        return !!found;
    }

    insert(key: K, value: V) {
        const now = this.updateIfNeeded();

        this.cur.set(key, new ExpireMapContainer<V>(value, now + this.ttl));
    }

    remove(key: K) {
        this.cur.delete(key);
        this.prev.delete(key);
    }
}

class ExpireMapContainer<V> {
    public readonly value: V;
    public readonly expireTime: number;

    constructor(value: V, expireTime: number) {
        this.value = value;
        this.expireTime = expireTime;
    }
}
