var fs = require('fs')
var http = require('http')
var https = require('https')
// const fetch = require('node-fetch')
const express = require('express')
const { exec } = require("child_process")
// var httpProxy = require('http-proxy')
const { WalletServer, Seed, AssetWallet, TokenWallet } = require('cardano-wallet-js');
const app = express()
const port = 80
const portssl = 443


// const ls = exec("cd ~/cardano-node && NETWORK=mainnet docker-compose up -d");
// ls.stdout.on("data", data => console.log(`stdout: ${data}`))
// ls.stderr.on("data", data => console.log(`stderr: ${data}`))
// ls.on('error', (error) => console.log(`error: ${error.message}`));
// ls.on("close", code => console.log(`child process exited with code ${code}`));

const api = {
    connect() { return WalletServer.init('http://localhost:8090/v2') },
    async networkinfo() {
        console.log('networkinfo()')
        const walletserver = api.connect()
        const networkinfo = walletserver.getNetworkInformation()
        console.log('networkinfo', await networkinfo.then(d=>d))
        return networkinfo;
    },
    keys() { return Seed.generateKeyPair },
    keyhash(key) { return Seed.getKeyHash(key) },
    buildscript(keyhash) { return Seed.buildSingleIssuerScript(keyhash) },
    buildtx(coins, ttl, meta, tokens) { return Seed.buildTransaction(coins, ttl, meta, tokens) },
    buildtxmeta(data) { return Seed.buildTransactionMetadata(data) },
    buildtxmint(tokens) { return Seed.buildTransactionMint(tokens) },
    scripthash(script) { return Seed.getScriptHash(script) },
    getpolicyid(scripthash) { return Seed.getPolicyId(scripthash) },
    sign(body, keys, meta, scripts) { return Seed.sign(body, keys, meta, scripts) },
    recoveryphrase() { return Seed.generateRecoveryPhrase() }, // 15 words
    async makewallet(name, pass) {
        const walletserver = api.connect()
        const recoveryphrase = api.recoveryphrase();
        const mnemonicsentence = Seed.toMnemonicList(recoveryphrase);
        const passphrase = pass;
        return await walletserver.createOrRestoreShelleyWallet(name, mnemonicsentence, passphrase);
    },
    async listaddresses(id, option, key) {
        let wallet = api.getwallet(id)
        switch (option) {
            case 'unused':
                return await wallet.getUnusedAddresses();
            case 'used':
                return await wallet.getUsedAddresses();
            case 'next':
                return await wallet.getNextAddress();
            case 'at':
                return await wallet.getAddressAt(key);

            default:
                break;
        }
        return await wallet.getAddresses();
    },
    async listwallets() {
        const walletserver = api.connect()
        return await walletserver.wallets();
    },
    async getwallet(id) {
        const walletserver = api.connect()
        return await walletserver.getShelleyWallet(id);
    },
    async getpools(stake) {
        const walletserver = api.connect()
        return await walletserver.getStakePools(stake);
    },
    async gettx(id, txid) {
        let wallet = api.getwallet(id)
        return await wallet.getTransaction(txid);
    },
    async stimatefees(id, address, amount) {
        let wallet = api.getwallet(id)
        let checkedaddress = new AddressWallet(address);
        return await wallet.estimateFee([checkedaddress], [amount]);
    },
    gettxfee(tx) { return Seed.getTransactionFee(tx) },
    walletavailablebalance(id) {
        let wallet = api.getwallet(id)
        return wallet.getAvailableBalance()
    },
    walletrewardsbalance(id) {
        let wallet = api.getwallet(id)
        return wallet.getRewardBalance()
    },
    wallettotalbalance(id) {
        let wallet = api.getwallet(id)
        return wallet.getTotalBalance()
    },
    async walletdelegation(id) {
        let wallet = api.getwallet(id)
        await wallet.refresh();
        return wallet.getDelegation();
    },
    async walletdelegationfee(id) {
        let wallet = api.getwallet(id)
        return await wallet.estimateDelegationFee();
    },
    async walletdelegate(id, pool, pass) {
        let wallet = api.getwallet(id)
        return await wallet.delegate(pool.id, pass);
    },
    async walletstats(id) {
        let wallet = api.getwallet(id)
        return await wallet.getUtxoStatistics()
    },
    async walletcoinselection(id, addresses, amounts, data) {
        let wallet = api.getwallet(id)
        return await wallet.getCoinSelection(addresses, amounts, data);
    },
    async deletewallet(id) {
        let wallet = api.getwallet(id)
        return await wallet.delete();
    },
    async walletdelegatestop(id, pass) {
        let wallet = api.getwallet(id)
        return await wallet.stopDelegation(pass);
    },
    async renamewallet(id, name) {
        let wallet = api.getwallet(id)
        return wallet = await wallet.rename(name);
    },
    async changepass(id, o, n) {
        let wallet = api.getwallet(id)
        wallet = await wallet.updatePassphrase(o, n);
    },
    async withdrawrewards(address, id, pass) {
        let wallet = api.getwallet(id)
        let rewardbalance = api.walletrewardsbalance()
        return await wallet.withdraw(pass, [address], [rewardbalance]);
    },
    async poolactions() {
        const walletserver = api.connect()
        return await walletserver.stakePoolMaintenanceActions();
    },
    async poolgarbagecollection() {
        const walletserver = api.connect()
        return await walletserver.triggerStakePoolGarbageCollection();
    },
    async gettransactions(id, start, end) {
        let wallet = api.getwallet(id)
        return await wallet.getTransactions(start, end);
    },
    async sendpayment(id, addresses, amounts, pass, meta) {
        let wallet = api.getwallet(id)
        return await wallet.sendPayment(pass, addresses, amounts, meta);
    },
    forgetpayment(txid) {
        let wallet = api.getwallet(id)
        return wallet.forgetTransaction(txid)
    },
    async submitexternaltx(id, amounts, meta, recoveryphrase) {
        let walletserver = api.connect()
        let wallet = api.getwallet(id)
        let addresses = api.listaddresses(id, 'unused').slice(0, 1)
        let info = api.networkinfo()
        let ttl = info.node_tip.absolute_slot_number * 12000;
        let coinselection = api.walletcoinselection(id, addresses, amounts, meta)
        let rootkey = api.derivekey(recoveryphrase)
        let signingKeys = coinselection.inputs.map(i => {
            let privateKey = Seed.deriveKey(rootkey, i.derivation_path).to_raw_key();
            return privateKey;
        });
        let metadata = Seed.buildTransactionMetadata(meta);
        let txBuild = Seed.buildTransaction(coinselection, ttl, metadata);
        let txBody = Seed.sign(txBuild, signingKeys, metadata);
        let signed = Buffer.from(txBody.to_bytes()).toString('hex');
        return await walletserver.submitTx(signed);
    },
    derivekey(phrase) { return Seed.deriveRootKey(phrase); },
    derivespendingkey(key, path) { return Seed.deriveKey(key, path || ['1852H', '1815H', '0H', '0', '0']).to_raw_key() },
    deriveaccountkey(key) { return Seed.deriveAccountKey(key, 0) },
    verifymessage(publickey, message, signed) {
        return Seed.verifyMessage(publickey, message, signed)
    },
    signmessage(message, phrase) {
        let rootkey = api.derivekey(phrase)
        let accountkey = api.deriveaccountkey(rootkey)
        const stakeprvkey = accountkey.derive(CARDANO_CHIMERIC) // chimeric
            .derive(0);
        const privatekey = stakeprvkey.to_raw_key();
        const publickey = privatekey.to_public();
        const signed = Seed.signMessage(privateKey, message);
        return api.verifymessage(publickey, message, signed);
    },

    async minttoken(id, addresses, meta, name, maxsupply, phrase) {
        let walletserver = api.connect()

        let wallet = api.getwallet(id)
        let keys = api.keys()
        let policyvkey = keys.publicKey
        let policyskey = keys.privateKey
        let script = api.buildscript(api.keyhash(policyvkey))
        let policyid = api.getpolicyid(api.scripthash(script))
        let tokendata = {}
        let data = {}
        tokendata[policyid] = meta
        data[0] = tokendata
        let asset = new AssetWallet(policyid, name, maxsupply);
        let tokens = [new TokenWallet(asset, script, [keys])];
        let scripts = tokens.map(t => t.script);
        let minada = Seed.getMinUtxoValueWithAssets(tokens);
        let amounts = [minada];
        let info = api.networkinfo()
        let ttl = info.node_tip.absolute_slot_number * 12000;
        let coinselection = api.walletcoinselection(id, addresses, amounts, data)
        let rootkey = api.derivekey(phrase)
        let signingkeys = coinselection.inputs.map(i => {
            let privatekey = api.derivekey(rootkey, i.derivation_path)
            return privatekey;
        });
        tokens.filter(t => t.scriptKeyPairs).forEach(t => signingkeys.push(...t.scriptKeyPairs.map(k => k.privateKey.to_raw_key())));
        let metadata = api.buildtxmeta(data)
        let mint = api.buildtxmint(tokens)
        coinselection.outputs = coinselection.outputs.map(output => {
            if (output.address === addresses[0].address) {
                output.assets = tokens.map(t => {
                    let asset = {
                        policy_id: t.asset.policy_id,
                        asset_name: t.asset.asset_name,
                        quantity: t.asset.quantity
                    };
                    return asset;
                });
            }
            return output;
        });
        let currentfee = coinselection.inputs.reduce((acc, c) => c.amount.quantity + acc, 0)
            - coinselection.outputs.reduce((acc, c) => c.amount.quantity + acc, 0)
            - coinselection.change.reduce((acc, c) => c.amount.quantity + acc, 0);
        let change = coinselection.change.reduce((acc, c) => c.amount.quantity + acc, 0);
        let txbody = api.buildtx(coinselection, ttl, metadata, tokens);
        txbody.set_mint(mint);
        let tx = api.sign(txbody, signingkeys, metadata, scripts)
        let fee = api.gettxfee(tx)
        coinselection.change[0].amount.quantity = change - (parseInt(fee.to_str()) - currentfee);
        metadata = api.buildtxmeta(data);
        txbody = api.buildtx(coinselection, ttl, metadata, tokens)
        txbody.set_mint(mint);
        tx = api.sign(txbody, signingkeys, metadata, scripts)
        let signed = Buffer.from(tx.to_bytes()).toString('hex');
        return await walletserver.submitTx(signed);
    }
}

app.get('/', (req, res) => {
    res.send('Hello World! We will be minting soon.')
})
app.get('/test', async (req, res) => {
    let test = {}
    test.connect = api.connect()
    test.networkinfo = await api.networkinfo()
    console.log(test)
    return res.send(JSON.stringify(test))
})
app.get('/docs', (req, res) => {
	let obj = '<p>'
Object.entries(api).map(a=>{
	console.log(a)
	obj+=a[1].toString()+'<br><br>'
})	
	console.log(obj)
	return res.send(obj+'</p>')
})
app.get('/network', (req, res) => res.send(JSON.stringify(api.connect())))
app.get('/networkinfo', async (req, res) => {
    console.log('gathering network info')
    let ni = await api.networkinfo().then(d=>d)
    console.log(ni)
    res.send(JSON.stringify(ni))
})

app.get('/cardano', async (req, res) => {
    let a = (async () => {
        let walletServer = api.connect()

        let information = await walletServer.getNetworkInformation();
        console.log('\nBlockchain Information', api.networkinfo().then(d=>d));

        let parameters = await walletServer.getNetworkParameters();
        console.log('\nBlockchain Parameters', parameters);

        let clock = await walletServer.getNetworkClock();
        console.log('\nBlockchain Clock', clock);

        let recoveryPhrase = Seed.generateRecoveryPhrase();
        let mnemonic_sentence = Seed.toMnemonicList(recoveryPhrase);
        console.log('\nRecovery Phrase', recoveryPhrase, mnemonic_sentence)
        let passphrase = 'xymbaxymba';
        let name = 'xymba-wallet';
        let wallet = await walletServer.createOrRestoreShelleyWallet(name, mnemonic_sentence, passphrase);

        let wallets = await walletServer.wallets();
        let xymbawallet = wallets[0]
        console.log('\nXymba Wallet Info', '\n Balance', xymbawallet.getAvailableBalance(), xymbawallet.id, Object.keys(xymbawallet))

        let addresses = await xymbawallet.getAddresses(); // list will contain at least 20 address
        console.log('\nAddresses', addresses.length, addresses[0])

        // address to hold the minted tokens. You can use which you want.
        addresses = [addresses[0]];

        // policy public/private keypair
        let keyPair = api.keys();
        let policyVKey = keyPair.publicKey;
        let policySKey = keyPair.privateKey;

        console.log('policy keys', { policyVKey, policySKey });

        // generate single issuer native script

        let keyHash = Seed.getKeyHash(policyVKey);
        let script = Seed.buildSingleIssuerScript(keyHash);

        //generate policy id

        let scriptHash = Seed.getScriptHash(script);
        let policyId = Seed.getPolicyId(scriptHash);

        // metadata
        let data = {};
        let tokenData = {}
        tokenData[policyId] = {
            XYMBA: {
                types: "00-ff",
                vid: "1.1.1",
                name: "Xymba",
                description: "Cosmic Psychedelic Tokens",
                type: "Token"
            }
        };
        data[0] = tokenData;
        // asset
        let asset = new AssetWallet(policyId, "XYMBA", 1000000);
        console.log('asset', asset);

        // token
        let tokens = [new TokenWallet(asset, script, [keyPair])];
        console.log('tokens', tokens);

        //scripts
        let scripts = tokens.map(t => t.script);

        // get min ada for address holding tokens
        let minAda = Seed.getMinUtxoValueWithAssets(tokens);
        let amount = [minAda];
        console.log('amounts', amount);

        // get ttl info
        //  let info = await walletServer.getNetworkInformation();
        let ttl = information.node_tip.absolute_slot_number * 12000;

        console.log('ttl', ttl);
        // get coin selection structure (without the assets)
        let coinSelection = await xymbawallet.getCoinSelection(addresses, amounts, data).then(x => x).catch(e => e);
        console.log('coinSelection', coinSelection.response.status, coinSelection.response.data);

        // add signing keys
        let rootKey = Seed.deriveRootKey('tank kind bike insect sister legend gown lava clinic music bid opera daring switch salmon');
        if (!coinSelection.inputs) return { information, xymbawallet, addresses, asset, tokens }
        let signingKeys = coinSelection.inputs.map(i => {
            let privateKey = Seed.deriveKey(rootKey, i.derivation_path).to_raw_key();
            return privateKey;
        });

        // add policy signing keys
        tokens.filter(t => t.scriptKeyPairs).forEach(t => signingKeys.push(...t.scriptKeyPairs.map(k => k.privateKey.to_raw_key())));

        let metadata = Seed.buildTransactionMetadata(data);
        let mint = Seed.buildTransactionMint(tokens);

        // the wallet currently doesn't support including tokens not previuosly minted
        // so we need to include it manually.
        coinSelection.outputs = coinSelection.outputs.map(output => {
            if (output.address === addresses[0].address) {
                output.assets = tokens.map(t => {
                    let absolute_slot_number = {
                        policy_id: t.asset.policy_id,
                        asset_name: t.asset.asset_name,
                        quantity: t.asset.quantity
                    };
                    return asset;
                });
            }
            return output;
        });

        let currentFee = coinSelection.inputs.reduce((acc, c) => c.amount.quantity + acc, 0)
            - coinSelection.outputs.reduce((acc, c) => c.amount.quantity + acc, 0)
            - coinSelection.change.reduce((acc, c) => c.amount.quantity + acc, 0);
        let change = coinSelection.change.reduce((acc, c) => c.amount.quantity + acc, 0);

        // we need to sing the tx and calculate the actual fee and the build again 
        // since the coin selection doesnt calculate the fee with the asset tokens included
        let txBody = Seed.buildTransaction(coinSelection, ttl, metadata, tokens);
        txBody.set_mint(mint);
        let tx = Seed.sign(txBody, signingKeys, metadata, scripts);
        let fee = Seed.getTransactionFee(tx);
        coinSelection.change[0].amount.quantity = change - (parseInt(fee.to_str()) - currentFee);

        // after tx signed the metadata is cleaned, so we need to build it again.
        metadata = Seed.buildTransactionMetadata(data);

        // finally build the tx again and sing it
        txBody = Seed.buildTransaction(coinSelection, ttl, metadata, tokens);
        txBody.set_mint(mint);
        tx = Seed.sign(txBody, signingKeys, metadata, scripts);

        // submit the tx
        let signed = Buffer.from(tx.to_bytes()).toString('hex');
        let txId = await walletServer.submitTx(signed);
        console.log('txId', txId)

        return information

    })()
    let cardano = async () => await a.then(x => JSON.stringify(x, null, 2))
    let resdata = cardano()
    console.log(resdata)
    res.send(await resdata)
})

http.createServer(app).listen(port, () => {
    console.log(`Example app listening at http://shwifty.io/`)
})

https.createServer({
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem')
}, app).listen(portssl, (req) => {

    console.log(`Example ssl app listening at https://shwifty.io/`)
})
/*
console.log('starting cardano node and wallet servers')
console.log('closing open nodes', 'cd ~/cardano-node && docker-compose stop')

 const stopdockandroll = exec("cd ~/cardano-node && docker-compose stop && docker-compose ps")
stopdockandroll.on('close', () => {
    console.log('starting nodes', 'cd ~/cardano-node && NETWORK=mainnet docker-compose up -d')
    let startdock = exec("cd ~/cardano-node && NETWORK=mainnet docker-compose up -d && docker-compose ps && cd ..")
    startdock.stdout.on("data", data => {
        console.log(`stdout: ${data}`)

        startdock.stderr.on("data", data => console.log(`stderr: ${data}`))
        startdock.on('error', (error) => console.log(`error: ${error.message}`));
        startdock.on("close", code => console.log(`startdock process exited with code ${code}`));
    })
})
stopdockandroll.on('error', (error) => console.log(`error: ${error.message}`));
stopdockandroll.on("close", code => console.log(`stopdockandroll process exited with code ${code}`));
*/
