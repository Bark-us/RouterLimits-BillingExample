import {Configuration} from "../src/Config";

const c : Configuration = {
    api: {listenPort: 8080},
    planMap: [],
    routerlimits: {
        apiKey: "",
        sharedSecret: "",
        webhookValidInterval: 0
    },
    stripe: {
        publishableKey: "",
        secretKey: "",
        webhookSecret: ""
    }
};

export default c;
