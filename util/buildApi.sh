#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

rm -fr "$DIR/../src/routerlimits/api"
rm -fr "$DIR/output"
java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/rlapi.yaml" -g typescript-node -o "$DIR/output"
mv "$DIR/output" "$DIR/../src/routerlimits/api"

#rm -fr "$DIR/../src/routerlimits/webhooks"
#rm -fr "$DIR/webhooks"
#java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/webhooks.yaml" -g typescript-node -o "$DIR/webhooks"
#mkdir -p "$DIR/../src/routerlimits/webhooks"
#mv $DIR/webhooks/model/* "$DIR/../src/routerlimits/webhooks"
#rm -fr $DIR/webhooks

#sed -i "s|import { AccountsListResponse.*$|import { AccountsListResponse} from './accountsListResponse';\nimport {WebhookAccountDeleted} from './webhookAccountDeleted';\nimport {WebhookAccountSubscribed} from './webhookAccountSubscribed';|g" $DIR/../src/routerlimits/webhooks/webhook.ts
