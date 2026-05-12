const fs = require('fs');
const path = require('path');
const mustache = require('mustache');

/**
 * This script automates the retrieval of contract addresses and generates
 * the subgraph.yaml from a template to avoid Git noise.
 */

const NETWORK = process.argv[2] || 'localhost';
const BROADCAST_PATH = path.resolve(__dirname, '../../contracts/broadcast/Deploy.s.sol/31337/run-latest.json');
const NETWORKS_CONFIG_PATH = path.resolve(__dirname, '../networks.json');
const LOCAL_NETWORKS_PATH = path.resolve(__dirname, '../networks.local.json');
const SUBGRAPH_TEMPLATE_PATH = path.resolve(__dirname, '../subgraph.template.yaml');
const SUBGRAPH_YAML_PATH = path.resolve(__dirname, '../subgraph.yaml');

function sync() {
    try {
        console.log(`🔍 Preparing Subgraph for network: ${NETWORK}...`);

        let networks = {};
        if (fs.existsSync(NETWORKS_CONFIG_PATH)) {
            networks = JSON.parse(fs.readFileSync(NETWORKS_CONFIG_PATH, 'utf8'));
        }

        // 1. If localhost, try to sync from Foundry broadcast
        if (NETWORK === 'localhost') {
            if (fs.existsSync(BROADCAST_PATH)) {
                console.log('📦 Reading latest deployment from Foundry...');
                const broadcast = JSON.parse(fs.readFileSync(BROADCAST_PATH, 'utf8'));
                const factoryTx = broadcast.transactions.find(tx => tx.contractName === 'TicketPulseFactory');

                if (factoryTx && factoryTx.contractAddress) {
                    const factoryAddress = factoryTx.contractAddress;
                    console.log(`📍 Found Factory at: ${factoryAddress}`);

                    networks.localhost = {
                        TicketPulseFactory: {
                            address: factoryAddress,
                            startBlock: 0
                        }
                    };
                    
                    // Save to networks.local.json (GIT-IGNORED)
                    fs.writeFileSync(LOCAL_NETWORKS_PATH, JSON.stringify(networks, null, 2));
                    console.log('✅ networks.local.json generated successfully!');
                }
            } else {
                console.warn(`⚠️ Foundry broadcast not found at ${BROADCAST_PATH}. Using existing values in networks.json.`);
            }
        }

        // 2. Validate target network exists in config
        if (!networks[NETWORK]) {
            throw new Error(`Network "${NETWORK}" not found in networks.json`);
        }

        // 3. Generate subgraph.yaml from template
        if (fs.existsSync(SUBGRAPH_TEMPLATE_PATH)) {
            console.log(`📄 Generating subgraph.yaml for ${NETWORK}...`);
            const template = fs.readFileSync(SUBGRAPH_TEMPLATE_PATH, 'utf8');
            
            // Prepare data for mustache
            const viewData = {
                network: NETWORK === 'localhost' ? 'localhost' : NETWORK,
                ...networks[NETWORK]
            };

            const output = mustache.render(template, viewData);
            fs.writeFileSync(SUBGRAPH_YAML_PATH, output);
            console.log('✨ subgraph.yaml updated successfully!');
        }

    } catch (error) {
        console.error('❌ Error syncing networks:', error.message);
        process.exit(1);
    }
}

sync();
