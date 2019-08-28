export class ExpireSet<K> {

    private cur : Map<K, number>;
    private prev : Map<K, number>;
    private readonly ttl : number;

    private lastUpdate : number;

    constructor(ttlSeconds : number) {
        this.cur = new Map();
        this.prev = new Map();
        this.ttl = ttlSeconds;

        this.lastUpdate = + new Date() / 1000 | 0;
    }

    updateIfNeeded() : number {
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

    has(key : K) : boolean {
        const now = this.updateIfNeeded();

        const inCur = this.cur.get(key);
        if (inCur) {
            return true;
        }

        const inPrev = this.prev.get(key);
        if (inPrev) {
            const ttl = inPrev - now;
            if (ttl >= 0) {
                return true;
            }
        }

        return false;
    }

    insert(key : K) : void {
        this.updateIfNeeded();
        this.cur.set(key, (+new Date() / 1000 | 0) + this.ttl);
    }
}
