#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

API_DEST="$DIR/../src/routerlimits/api"
YAML_FILE="$DIR/rlapi.yaml"

LAST_GENERATION_TIME=$(date -r "$API_DEST" --rfc-3339=ns)
touch -d "$LAST_GENERATION_TIME" /tmp/lastgentime
NEEDS_UPDATE=$(find "$YAML_FILE" -newer /tmp/lastgentime | wc -l)

if [ "$NEEDS_UPDATE" -eq 1 ] ; then
  rm -fr "$API_DEST"
  rm -fr "$DIR/output"
  java -jar "$DIR/openapi-generator-cli.jar" generate -i "$YAML_FILE" -g typescript-node -o "$DIR/output"
  mv "$DIR/output" "$API_DEST"
fi

#rm -fr "$DIR/../src/routerlimits/webhooks"
#rm -fr "$DIR/webhooks"
#java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/webhooks.yaml" -g typescript-node -o "$DIR/webhooks"
#mkdir -p "$DIR/../src/routerlimits/webhooks"
#mv $DIR/webhooks/model/* "$DIR/../src/routerlimits/webhooks"
#rm -fr $DIR/webhooks

#sed -i "s|import { AccountsListResponse.*$|import { AccountsListResponse} from './accountsListResponse';\nimport {WebhookAccountDeleted} from './webhookAccountDeleted';\nimport {WebhookAccountSubscribed} from './webhookAccountSubscribed';|g" $DIR/../src/routerlimits/webhooks/webhook.ts
