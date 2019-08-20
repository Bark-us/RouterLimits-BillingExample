#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

java -jar "$DIR/openapi-generator-cli.jar" generate -i "$DIR/rlapi.yaml" -g typescript-node -o output
rm -fr "$DIR/../src/rlapi"
mv output "$DIR/../src/rlapi"
