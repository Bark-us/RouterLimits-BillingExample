#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

API_DEST="$DIR/../src/routerlimits/api"
YAML_FILE="$DIR/rlapi.yaml"

if [ ! -d "$API_DEST" ]; then
  NEEDS_UPDATE=1
else
  LAST_GENERATION_TIME=$(date -r "$API_DEST" --rfc-3339=ns)
  touch -d "$LAST_GENERATION_TIME" /tmp/lastgentime
  NEEDS_UPDATE=$(find "$YAML_FILE" -newer /tmp/lastgentime | wc -l)
fi

if [ "$NEEDS_UPDATE" -eq 1 ] ; then
  rm -fr "$API_DEST"
  rm -fr "$DIR/output"
  java -jar "$DIR/openapi-generator-cli.jar" generate -i "$YAML_FILE" -g typescript-node -o "$DIR/output"
  mv "$DIR/output" "$API_DEST"
fi
