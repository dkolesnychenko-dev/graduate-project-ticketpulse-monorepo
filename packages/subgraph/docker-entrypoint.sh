#!/bin/bash
set -e

# Path to the mounted monorepo
WORKSPACE="/workspace"
SUBGRAPH_DIR="$WORKSPACE/packages/subgraph"
CONTRACTS_DIR="$WORKSPACE/packages/contracts"

# Create a temporary run directory to avoid modifying the host filesystem
RUN_DIR="/tmp/matchstick-run"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"

# Link the contracts package so relative paths in subgraph.yaml work (e.g. ../contracts/out/...)
ln -s "$CONTRACTS_DIR" "$RUN_DIR/contracts"

# Create the subgraph run directory
mkdir -p "$RUN_DIR/subgraph"
cd "$RUN_DIR/subgraph"

echo "Setting up Matchstick environment in $RUN_DIR/subgraph..."

# Copy all files from the subgraph package except the ones we want to override
# This avoids symlink resolution issues on Docker host mounts.
shopt -s dotglob
for item in "$SUBGRAPH_DIR"/*; do
    basename_item=$(basename "$item")
    if [ "$basename_item" != "node_modules" ] && [ "$basename_item" != "matchstick.yaml" ]; then
        cp -r "$item" .
    fi
done

# Link the locally installed node_modules
ln -sf /opt/subgraph-deps/node_modules node_modules

# Use our Docker-specific config from the image
cp /matchstick.docker.yaml ./matchstick.yaml

# Debug: verify critical files exist
echo "--- DEBUG INFO ---"
echo "Current directory: $(pwd)"
echo "Node path: $(which node)"
echo "Node version: $(node -v 2>/dev/null || echo 'not found')"
echo "Searching for asc..."
ASC_PATH=$(which asc 2>/dev/null || find /opt/subgraph-deps -name asc -type f | head -n 1 || find /usr -name asc -type f | head -n 1)
echo "Found asc at: $ASC_PATH"

if [ -n "$ASC_PATH" ]; then
    mkdir -p /opt/subgraph-deps/node_modules/assemblyscript/bin
    if [ ! -f "/opt/subgraph-deps/node_modules/assemblyscript/bin/asc" ]; then
        echo "Creating symlink for asc..."
        ln -sf "$ASC_PATH" /opt/subgraph-deps/node_modules/assemblyscript/bin/asc
    fi
fi

if [ -f "/opt/subgraph-deps/node_modules/assemblyscript/bin/asc" ]; then
    echo "asc exists at /opt/subgraph-deps/node_modules/assemblyscript/bin/asc"
    echo "asc shebang: $(head -n 1 /opt/subgraph-deps/node_modules/assemblyscript/bin/asc)"
    # HACK: Create a redirect file for matchstick-as to resolve "File '~lib/matchstick-as.ts' not found" errors.
    # We place it inside the matchstick-as folder so relative imports work correctly.
    echo 'export * from "./assembly/index";' > /opt/subgraph-deps/node_modules/matchstick-as/index.ts
    
    # Also create a top-level redirect in node_modules as a fallback
    echo 'export * from "./matchstick-as/assembly/index";' > /opt/subgraph-deps/node_modules/matchstick-as.ts

    # Final fallback: link it in AssemblyScript's own std library
    AS_STD_LIB="/opt/subgraph-deps/node_modules/assemblyscript/std/assembly"
    if [ -d "$AS_STD_LIB" ]; then
        echo 'export * from "../../../matchstick-as/assembly/index";' > "$AS_STD_LIB/matchstick-as.ts"
    fi

    # CREATE ASC WRAPPER to fix compatibility issues
    REAL_ASC=$(readlink -f /opt/subgraph-deps/node_modules/.bin/asc)
    echo "#!/usr/bin/env node
const { spawnSync } = require('child_process');
// Filter out flags that newer asc doesn't like or that matchstick passes incorrectly
const args = process.argv.slice(2).filter(arg => arg !== '--explicitStart');

// DISABLE newer WASM features that the older matchstick runtime doesn't support (Unknown opcode 252)
args.push('--disable', 'bulk-memory');
args.push('--disable', 'nontrapping-f2i');
args.push('--disable', 'sign-extension');
// Ensure the start function is exported as _start, which matchstick expects
args.push('--exportStart', '_start');

const result = spawnSync('node', ['$REAL_ASC', ...args], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);" > /opt/subgraph-deps/node_modules/.bin/asc-wrapper
    chmod +x /opt/subgraph-deps/node_modules/.bin/asc-wrapper
    
    # Overwrite the symlink to point to our wrapper
    ln -sf /opt/subgraph-deps/node_modules/.bin/asc-wrapper /opt/subgraph-deps/node_modules/assemblyscript/bin/asc
    # Also ensure the bin link points to the wrapper
    ln -sf /opt/subgraph-deps/node_modules/.bin/asc-wrapper /opt/subgraph-deps/node_modules/.bin/asc
    
    # PATCH graph-ts to remove "this !== null" checks that fail in newer AssemblyScript
    NUMBERS_TS="/opt/subgraph-deps/node_modules/@graphprotocol/graph-ts/common/numbers.ts"
    if [ -f "$NUMBERS_TS" ]; then
        echo "Patching $NUMBERS_TS..."
        sed -i "s/assert(this !== null,.*);//g" "$NUMBERS_TS"
    fi
    
    # Also ensure @graphprotocol/graph-ts is handled if needed
    # (Usually asc handles scoped packages if the lib path points to node_modules)
else
    echo "asc STILL NOT FOUND at /opt/subgraph-deps/node_modules/assemblyscript/bin/asc"
    echo "Contents of /opt/subgraph-deps/node_modules (if exists):"
    ls -la /opt/subgraph-deps/node_modules 2>/dev/null || echo "node_modules not found"
fi

echo "Checking matchstick-as package..."
ls -la /opt/subgraph-deps/node_modules/matchstick-as/ 2>/dev/null || echo "matchstick-as not found"
cat /opt/subgraph-deps/node_modules/matchstick-as/package.json 2>/dev/null || echo "matchstick-as/package.json not found"
ls -la /opt/subgraph-deps/node_modules/matchstick-as/assembly/ 2>/dev/null || echo "matchstick-as/assembly not found"

echo "Checking node_modules link..."
ls -ld node_modules
ls -la node_modules/assemblyscript/bin/asc 2>/dev/null || echo "asc not reachable through node_modules link"

if [ ! -f "node_modules/@graphprotocol/graph-ts/global/global.ts" ]; then
    echo "ERROR: Critical file global.ts not found in node_modules!"
    ls -la node_modules/@graphprotocol/graph-ts/global/ 2>/dev/null || echo "Directory global/ not found"
    ls -la /opt/subgraph-deps/node_modules/@graphprotocol/graph-ts/ 2>/dev/null
fi

echo "Checking ABIs..."
ls -la ../contracts/out/TicketPulseFactory.sol/TicketPulseFactory.json || echo "ABI TicketPulseFactory.json NOT FOUND"
ls -la ../contracts/out/TicketPulseEvent.sol/TicketPulseEvent.json || echo "ABI TicketPulseEvent.json NOT FOUND"

echo "Checking schema..."
ls -la schema.graphql || echo "schema.graphql NOT FOUND"

echo "Checking runtime directory contents..."
ls -la .

echo "Checking matchstick.yaml..."
cat matchstick.yaml

# Create asconfig.json to disable strict null checks which cause issues with some graph-ts versions
echo '{
  "options": {
    "strict": false,
    "noImplicitAny": false
  }
}' > asconfig.json

echo "--- END DEBUG INFO ---"

echo "Matchstick environment ready. Starting tests..."

# Run matchstick with passed arguments
export RUST_BACKTRACE=1
exec matchstick "$@"
