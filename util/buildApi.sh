#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/rlapi.yaml" -g typescript-node -o "$DIR/output"
rm -fr "$DIR/../src/rlapi"
mv "$DIR/output" "$DIR/../src/rlapi"

rm -fr "$DIR/webhooks"
java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/webhooks.yaml" -g typescript-node -o "$DIR/webhooks"
mkdir -p "$DIR/../src/webhookTypes"
mv $DIR/webhooks/model/* "$DIR/../src/webhookTypes"
rm -fr $DIR/webhooks

sed -i "s|import { AccountsListResponse.*$|import { AccountsListResponse} from './accountsListResponse';\nimport {WebhookAccountDeleted} from './webhookAccountDeleted';\nimport {WebhookAccountSubscribed} from './webhookAccountSubscribed';|g" $DIR/../src/webhookTypes/webhook.ts
