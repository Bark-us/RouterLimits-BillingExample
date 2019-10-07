# ThirdPartyBillingExample
This project demonstrates the ability to connect third party billing systems to Router Limits. 
Stripe is used as an example, but the code can be adapted and extended to support other billing/payment systems.

This project also provides an API that can be used to implement a custom account/billing management experience for end
users. A web-application front-end for the API is available separately [here](https://github.com/RouterLimits/PaymentPortalExample).

## Building
You will need NodeJS and npm installed. 

1. Run  `npm ci`
1. Run `npm run build`
1. The compiled javascript will be placed in the `dist/` folder

## Configuring
1. Modify `config/default.ts` as appropriate or create a `config/local.ts` file with values that will override 
`config/default.ts` at runtime
1. Configure stripe (or other billing provider) to POST webhooks to `https://this-server-endpoint:port/webhooks/billing`. Make sure that
the shared secret stripe is using to POST webhooks matches what you've put in the config file. Make sure that Stripe is
configured to send `customer.subscription.deleted` events
1. Configure Router Limits to send webhooks to `https://this-server-endpoint:port/webhooks/routerlimits`. Make sure that
the shared secret configured in the Pro Portal matches the value in the config file

## Running
`node dist/index.js`
