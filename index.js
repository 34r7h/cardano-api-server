var fs = require('fs')
var http = require('http')
var https = require('https')
// const fetch = require('node-fetch')
const express = require('express')
const { exec } = require("child_process")
var cors = require('cors')
const { WalletServer, Seed, AssetWallet, TokenWallet, AddressWallet } = require('cardano-wallet-js');
const { config } = require('process')
const app = express()
app.use(cors())
const port = 80
const portssl = 443


// const ls = exec("cd ~/cardano-node && NETWORK=mainnet docker-compose up -d");
// ls.stdout.on("data", data => console.log(`stdout: ${data}`))
// ls.stderr.on("data", data => console.log(`stderr: ${data}`))
// ls.on('error', (error) => console.log(`error: ${error.message}`));
// ls.on("close", code => console.log(`child process exited with code ${code}`));

let cardanoconfig = { // https://hydra.iohk.io/build/6498473/download/1/testnet-shelley-genesis.json
    "activeSlotsCoeff": 0.05,
    "protocolParams": {
        "protocolVersion": {
            "minor": 0,
            "major": 2
        },
        "decentralisationParam": 1,
        "eMax": 18,
        "extraEntropy": {
            "tag": "NeutralNonce"
        },
        "maxTxSize": 16384,
        "maxBlockBodySize": 65536,
        "maxBlockHeaderSize": 1100,
        "minFeeA": 44,
        "minFeeB": 155381,
        "minUTxOValue": 1000000,
        "poolDeposit": 500000000,
        "minPoolCost": 340000000,
        "keyDeposit": 2000000,
        "nOpt": 150,
        "rho": 0.003,
        "tau": 0.20,
        "a0": 0.3
    }
}

let docs = (() => {
    let api = {}
    api[`network`] = { example: `/network` }
    api[`network-info`] = { example: `/network-info` }
    api['keys'] = { example: `/keys` }
    api[`key-hash`] = { example: `/key-hash` }
    api[`make-wallet`] = { example: `/make-wallet?name=somelongenough&pass=somelongenoughpassword` }
    api[`list-addresses`] = { example: `/list-addresses?id=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`list-wallets`] = { example: `/list-wallets` }
    api[`get-wallet`] = { example: `/get-wallet?id=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`get-pools`] = { example: `/get-pools` }
    api[`get-tx`] = { example: `/get-tx?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&tx=601eb8507d68c4fe71c943881f61d76d84bc1d12f728ad5ccbaef2a4b22c7631` }
    api[`estimate-fees`] = { example: `/estimate-fees?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&address=addr_test1qrwn3kkgm0544kqzar5z5j42gstfyzv33v9r6sfd2pn0n5ag39uppmtwkm39f95szc4km6k09ghrn78vthusckne79jsu20937&amount=4353452` }
    api[`wallet-balance`] = { example: `/wallet-balance?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`reward-balance`] = { example: `/reward-balance?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`total-balance`] = { example: `/total-balance?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`get-delegation`] = { example: `/get-delegation?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`delegation-fee`] = { example: `/delegation-fee?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`delegate`] = { example: `/delegate?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&pool=pool1fxcvkd47crljtjlqlj0ullargjrguj9meev2vj0aq574zpq9nec&pass=xymbacardano` }
    api[`wallet-stats`] = { example: `/wallet-stats?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`coin-select`] = { example: `/coin-select?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&amounts=4234324&data={"hello":"world"}` }
    api[`delete-wallet`] = { example: ` /delete-wallet?wallet=$ID` }
    api[`stop-delegate`] = { example: `/stop-delegate?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&pass=xymbacardano` }
    api[`change-password`] = { example: `/change-password?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&oldpass=xymbacardano&newpass=xymbacardanowalletbro` }
    api[`withdraw-rewards`] = { example: `/withdraw-rewards?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&pass=xymbacardano` }
    api[`pool-actions`] = { example: `/pool-actions` }
    api[`pool-garbage`] = { example: `/pool-garbage` }
    api[`get-txs`] = { example: `/get-txs?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`send-payment`] = { example: `/send-payment?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&addresses=addr_test1qzu06fxmkc5hgjxcucuhlx5rwgnphnf6cj3t4gpukp5dkyag39uppmtwkm39f95szc4km6k09ghrn78vthusckne79js6xn5dj&amounts=5555555&pass=xymbacardano&data={"sup":"world"}` }
    api[`cancel-payment`] = { example: `/cancel-payment?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&&tx=11b880e7bb7f30badf8919446f2416d7c1f6724d8add948308afd7662161c493` }
    api[`submit-tx`] = { example: `/submit-tx?wallet=22283c232d1d71829ce14ea3a1924c3e5c4ee522&amounts=3333333&data={"1":{"id":"love","scope":"cardano","refid":"0x"}}&phrase=grow,doll,joy,ceiling,cage,once,task,soup,fitness,one,recycle,tower,shrug,dentist,fever` }
    api[`mint`] = {example: `/mint?id=b112d4a931cd6c51bc04ec2b54112a220e66406d&addresses=addr_test1qzu06fxmkc5hgjxcucuhlx5rwgnphnf6cj3t4gpukp5dkyag39uppmtwkm39f95szc4km6k09ghrn78vthusckne79js6xn5dj&data={"1":{"id":"love","scope":"cardano","refid":"0x"}}&name=xymbabro&maxsupply=2&phrase=grow,doll,joy,ceiling,cage,once,task,soup,fitness,one,recycle,tower,shrug,dentist,fever`}
    return api
})()

const api = {
    connect() {
        return WalletServer.init('http://localhost:8090/v2')
    },
    async networkinfo() {
        const walletserver = api.connect()
        const networkinfo = walletserver.getNetworkInformation()
        return networkinfo;
    },
    keys() {
        return Seed.generateKeyPair()
    },
    async keyhash(key) {
        console.log(key);
        return Seed.getKeyHash(key)
    },
    buildscript(keyhash) { return Seed.buildSingleIssuerScript(keyhash) },
    buildtx(coins, ttl, meta, tokens) { return Seed.buildTransaction(coins, ttl, meta, tokens) },
    buildtxmeta(data) { return Seed.buildTransactionMetadata(data) },
    buildtxmint(coinselection, ttl, tokens, keys, data, cardanoconfig) {
        // console.log('building mint tx', JSON.stringify([coinselection, ttl, tokens, keys, data, cardanoconfig], null, 2));
        console.log('coinselection', coinselection,'\nttl '+ ttl,'\ntokens '+ JSON.stringify(tokens),'\nkeys'+ JSON.stringify(keys),'\ndata '+ JSON.stringify(data),'\ncardanoconfig '+ cardanoconfig);
        // console.log(Seed.buildTransactionWithToken(coinselection, ttl, tokens, keys, {data: data, config: cardanoconfig}))
        console.log('building tx mint', keys);
        let build = Seed.buildTransactionWithToken(coinselection, ttl, tokens, keys, {data: data, config: cardanoconfig})
        return build
    },
    scripthash(script) { return Seed.getScriptHash(script) },
    getpolicyid(scripthash) { return Seed.getPolicyId(scripthash) },
    phrase() { return Seed.generateRecoveryPhrase() }, // 15 words
    async makewallet(name, pass, phrase) {
        const walletserver = api.connect()
        const recoveryphrase = phrase || api.phrase();
        const mnemonicsentence = Seed.toMnemonicList(recoveryphrase);
        const passphrase = pass;
        return [recoveryphrase, await walletserver.createOrRestoreShelleyWallet(name, mnemonicsentence, passphrase)];
    },
    async listaddresses(id, option, key) {
        let wallet = await api.getwallet(id).then(x => x)
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
        // [ /get-pools?stake=80000000000000 ]
        const walletserver = api.connect()
        return await walletserver.getStakePools(stake);
    },
    async gettx(id, txid) {
        let wallet = await api.getwallet(id).then(x => x)
        return wallet.getTransaction(txid);
    },
    async estimatefees(id, address, amount) {
        return await api.getwallet(id).then(async (x) => {
            let checkedaddress = new AddressWallet(address);
            return x.estimateFee([checkedaddress], [amount])
        })
    },
    gettxfee(tx) { return Seed.getTransactionFee(tx) },
    async walletavailablebalance(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return wallet.getAvailableBalance()
    },
    async walletrewardsbalance(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return wallet.getRewardBalance()
    },
    async wallettotalbalance(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return wallet.getTotalBalance()
    },
    async getdelegation(id) {
        let wallet = await api.getwallet(id).then(x => x)
        await wallet.refresh();
        return wallet.getDelegation();
    },
    async walletdelegationfee(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.estimateDelegationFee();
    },
    async walletdelegate(id, pool, pass) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.delegate(pool, pass);
    },
    async walletstats(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.getUtxoStatistics()
    },
    async walletcoinselection(id, addresses, amounts, data) {
        // console.log('walletcoinselection()\n', id, addresses, amounts, data);
        let wallet = await api.getwallet(id).then(x => x)
        if (addresses == undefined) addresses = await api.listaddresses(id).then(x => x.slice(0, 1))
        if (data && typeof data == 'string') data = JSON.parse(data)
        // console.log('getCoinSelection()', await wallet.getCoinSelection(addresses, amounts, data).then(x => x));
        return await wallet.getCoinSelection(addresses, amounts, data).then(x => x);
    },
    async deletewallet(id) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.delete();
    },
    async walletdelegatestop(id, pass) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.stopDelegation(pass);
    },
    async renamewallet(id, name) {
        this.example = `/rename-wallet?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&name=xymbacardanowalletbro`
        let wallet = await api.getwallet(id).then(x => x)
        return wallet = await wallet.rename(name);
    },
    async changepass(id, o, n) {
        let wallet = await api.getwallet(id).then(x => x)
        wallet = await wallet.updatePassphrase(o, n);
        return wallet
    },
    async withdrawrewards(id, pass) {
        // TODO Test after reward balance is up
        let wallet = await api.getwallet(id).then(x => x)
        let address = await api.listaddresses(id, 'unused').then(x => x.slice(0, 1)).catch(e => e)
        let rewardbalance = await api.walletrewardsbalance(id).then(x => x)
        return rewardbalance && await wallet.withdraw(pass, [address], [rewardbalance]) || false;
    },
    async poolactions() {
        const walletserver = api.connect()
        return await walletserver.stakePoolMaintenanceActions();
    },
    async poolgarbagecollection() {
        const walletserver = api.connect()
        return await walletserver.triggerStakePoolGarbageCollection();
    },
    async gettxs(id, start, end) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.getTransactions(start, end);
    },
    async sendpayment(id, addresses, amounts, pass, meta) {
        let wallet = await api.getwallet(id).then(x => x)
        return await wallet.sendPayment(pass, addresses, amounts, meta).then(x=>x).catch(e=>e);
    },
    async cancelpayment(id, txid) { // BROKEN.. function undefined
        let wallet = await api.getwallet(id).then(x => x)
        console.log(Object.keys(wallet))
        return wallet.forgetTransaction(txid)
    },
    async submittx(id, amounts, meta, phrase) {
        let walletserver = api.connect()
        let addresses = await api.listaddresses(id).then(x => x.slice(0, 1))
        let info = await api.networkinfo().then(x => x)
        let ttl = info.node_tip.absolute_slot_number * 12000;
        let coinselection = await api.walletcoinselection(id, addresses, amounts, meta).then(x => x)
        if (Array.isArray(phrase)) phrase = phrase.join(' ')
        if (typeof phrase === 'string' && phrase.includes('[')) phrase = phrase.replace('[', '').replace(']', '').replace(/,/g, '')
        else if (typeof phrase === 'string') phrase = phrase.split(',')
        let rootkey = api.deriverootkey(phrase)
        let signingkeys = coinselection.inputs.map(i => {
            // console.log(i);
            let privateKey = Seed.deriveKey(rootkey, i.derivation_path).to_raw_key();
            return privateKey;
        });
        let txBody, txBuild
        if (meta !== null) {
            let metadata = Seed.buildTransactionMetadata(meta)
            txBuild = Seed.buildTransaction(coinselection, ttl, { metadata: metadata, config: cardanoconfig });
            txBody = Seed.sign(txBuild, signingkeys, metadata);
        } else {
            txBuild = Seed.buildTransaction(coinselection, ttl);
            txBody = Seed.sign(txBuild, signingkeys);
        }
        let signed = Buffer.from(txBody.to_bytes()).toString('hex');
        return await walletserver.submitTx(signed).then(x => x).catch(e => e)
    },
    derivekey(phrase, path){return Seed.deriveKey(phrase, path).to_raw_key();},
    deriverootkey(phrase) { return Seed.deriveRootKey(phrase); },
    derivespendingkey(key, path) { return Seed.deriveKey(key, path || ['1852H', '1815H', '0H', '0', '0']).to_raw_key() },
    deriveaccountkey(key) { return Seed.deriveAccountKey(key, 0) },
    verifymessage(publickey, message, signed) {
        return Seed.verifyMessage(publickey, message, signed)
    },
    sign(body, keys, meta, scripts) { 
        // console.log('signing\n', body,'\n', keys,'\n', meta,'\n', scripts);
        let sign = Seed.sign(body, keys, meta, scripts)
        // console.log('sign', sign);
        return sign
    },
    signmessage(message, phrase) {
        let rootkey = api.deriverootkey(phrase)
        let accountkey = api.deriveaccountkey(rootkey)
        const stakeprvkey = accountkey.derive(CARDANO_CHIMERIC) // chimeric
            .derive(0);
        const privatekey = stakeprvkey.to_raw_key();
        const publickey = privatekey.to_public();
        const signed = Seed.signMessage(privateKey, message);
        return api.verifymessage(publickey, message, signed);
    },

    async mint(id, addresses, meta, name, maxsupply, phrase) {
        let walletserver = api.connect()
        let keys = api.keys()
        let policyvkey = keys.publicKey
        let policyskey = keys.privateKey
        let policyhash = await api.keyhash(policyvkey).then(x=>x).catch(x=>x)
        let script = api.buildscript(policyhash)
        let policyid = api.getpolicyid(api.scripthash(script))
        let tokendata = {}
        let data = {}
        tokendata[policyid] = meta
        data[0] = tokendata
        let asset = new AssetWallet(policyid, name, maxsupply);
        let tokens = [new TokenWallet(asset, script, [keys])];
        let scripts = tokens.map(t => t.script);
        let minada = Seed.getMinUtxoValueWithAssets([asset]);
        let amounts = [minada];
        let info = await api.networkinfo().then(x=>x)
        let ttl = info.node_tip.absolute_slot_number * 12000;
        let coinselection = await api.walletcoinselection(id, null, amounts, data).then(x=>x).catch(x=>x)
        if (typeof phrase === 'string') phrase = phrase.split(',')

        let rootkey = api.deriverootkey(phrase)
        let signingkeys = coinselection.inputs.map(i => {
            let privatekey = api.derivekey(rootkey, i.derivation_path)
            return privatekey;
        });
        tokens.filter(t => t.scriptKeyPairs).forEach(t => signingkeys.push(...t.scriptKeyPairs.map(k => k.privateKey.to_raw_key())));
        let metadata = api.buildtxmeta(data)
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
        let rawtxbody = api.buildtx(coinselection, ttl, metadata, tokens);
        let rawtx = api.sign(rawtxbody, signingkeys, metadata, scripts)
        let fee = api.gettxfee(rawtx)
        coinselection.change[0].amount.quantity = change - (parseInt(fee.to_str()) - currentfee);
        let txbody = api.buildtxmint(coinselection, ttl, tokens, signingkeys, data, cardanoconfig)
        let tx = api.sign(txbody, signingkeys, metadata, scripts)
        let signed = Buffer.from(tx.to_bytes()).toString('hex');
        console.log('signed\n', signed, '\ntx\n', tx);
        let submit = await walletserver.submitTx(signed).then(x=>x).catch(e=>e)
        console.log('submit', submit.response.data);
        return submit.toJSON();
    }
}

app.get('/', (req, res) => {
    let obj = '<ul>'
    Object.entries(docs).map(z => {
        obj += `<li style=" align-items:center;"><b>${z[0]}</b><br><br>`
        obj += '<div style="overflow-wrap: anywhere;">Example<br><a href="' + encodeURI(z[1].example) + '">' + z[1].example + '</a></div><br>'
        obj += Object.keys(api).includes(z[0].replace('-', '')) ? `Code<br><code style="font: 12px mono; white-space: pre-wrap; background: rgba(0,0,0,.03); padding: 8px">`+api[z[0].replace('-', '')].toString()+`</code><br>` : ''
        obj += '<br></li>'
    })
    return res.send(obj + '</ul>')
})

app.get('/network', (req, res) => res.send(JSON.stringify(api.connect())))
app.get('/network-info', async (req, res) => {
    let ni = await api.networkinfo().then(d => d).catch(e => e)
    res.send(JSON.stringify(ni))
    return ni
})
app.get('/keys', (req, res) => res.send(JSON.stringify(api.keys())))
app.get('/phrase', (req, res) => res.send(api.phrase()))
app.get('/make-wallet', async (req, res) => {
    let walletret = api.makewallet(req.query.name, req.query.pass, req.query.phrase)
    res.send(JSON.stringify(await walletret.then(x => x).catch(e => e)))
    return walletret
})
app.get('/get-wallet', async (req, res) => {
    let wallet = await api.getwallet(req.query.id).then(x => x).catch(e => e)
    res.send(JSON.stringify(wallet))
    return wallet
})
app.get('/wallet-balance', async (req, res) => {
    let balance = await api.walletavailablebalance(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(balance))
    return balance
})
app.get('/wallet-stats', async (req, res) => {
    let stats = await api.walletstats(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(stats))
    return stats
})
app.get('/reward-balance', async (req, res) => {
    let balance = await api.walletrewardsbalance(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(balance))
    return balance
})
app.get('/withdraw-rewards', async (req, res) => {
    let withdrawrewards = await api.withdrawrewards(req.query.wallet, req.query.pass).then(x => x).catch(e => e)
    res.send(JSON.stringify(withdrawrewards))
    return withdrawrewards
})
app.get('/total-balance', async (req, res) => {
    let balance = await api.wallettotalbalance(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(balance))
    return balance
})
app.get('/list-addresses', async (req, res) => {
    let addresses = await api.listaddresses(req.query.id, req.query.option, req.query.key).then(x => x).catch(e => e)
    res.send(JSON.stringify(addresses))
    return addresses
})
app.get('/list-wallets', async (req, res) => {
    let wallets = await api.listwallets().then(x => x).catch(e => e)
    res.send(JSON.stringify(wallets))
    return wallets
})

app.get('/delete-wallet', async (req, res) => {
    let deletedwallet = await api.deletewallet(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(deletedwallet))
    return deletedwallet
})
app.get('/get-delegation', async (req, res) => {
    let delegated = await api.getdelegation(req.query.wallet).then(x => x).catch(e => e)
    res.send(JSON.stringify(delegated))
    return delegated
})
app.get('/delegation-fee', async (req, res) => {
    let dfee = await api.walletdelegationfee(req.query.wallet).then(x => x).catch(e => e)
    res.send(dfee)
    return dfee
})
app.get('/delegate', async (req, res) => {
    let delegate = await api.walletdelegate(req.query.wallet, req.query.pool, req.query.pass).then(x => x).catch(e => e)
    res.send(delegate)
    return delegate
})
app.get('/stop-delegate', async (req, res) => {
    let stopdelegate = await api.walletdelegatestop(req.query.wallet, req.query.pass).then(x => x).catch(e => e)
    res.send(stopdelegate)
    return stopdelegate
})
app.get('/rename-wallet', async (req, res) => {
    let renamewallet = await api.renamewallet(req.query.wallet, req.query.name).then(x => x).catch(e => e)
    res.send(renamewallet)
    return renamewallet
})
app.get('/change-password', async (req, res) => {
    let changepass = await api.changepass(req.query.wallet, req.query.oldpass, req.query.newpass).then(x => x).catch(e => e)
    console.log(changepass)
    res.send(JSON.stringify(changepass))
    return changepass
})
app.get('/key-hash', async (req, res) => {
    let keys = api.keys()
    let keyhashret = await api.keyhash(keys.publicKey)
    res.send(keyhashret)
    return keyhashret
})
app.get('/get-pools', async (req, res) => {
    const pools = await api.getpools(req.query.stake).then(x => x).catch(e => e)
    res.send(JSON.stringify(pools))
    return pools
})
app.get('/get-tx', async (req, res) => {
    let tx = await api.gettx(req.query.wallet, req.query.tx).then(x => x).catch(e => e)
    res.send(JSON.stringify(tx))
    return tx
})
app.get('/get-txs', async (req, res) => {
    let txs = await api.gettxs(req.query.wallet, req.query.start, req.query.end).then(x => x).catch(e => e)
    res.send(JSON.stringify(txs))
    return txs
})
app.get('/estimate-fees', async (req, res) => {
    let estimate = await api.estimatefees(req.query.wallet, req.query.address, +req.query.amount, req.query.data, req.query.assets).then(x => x).catch(e => e)
    res.send(JSON.stringify(estimate))
    return estimate
})
app.get('/get-tx-fee', async (req, res) => {
    let txfee = api.gettxfee(req.query.tx)
    res.send(txfee)
    return txfee
})
app.get('/coin-select', async (req, res) => {
    let coins = await api.walletcoinselection(req.query.wallet, req.query.addresses && req.query.addresses.split(','), req.query.amounts.split(',').map(x => +x), req.query.data).then(x => x).catch(e => e)
    res.send(JSON.stringify(coins))
    return coins
})
app.get('/pool-actions', async (req, res) => {
    let poolactions = await api.poolactions().then(x => x)
    res.send(JSON.stringify(poolactions))
    return poolactions
})
app.get('/pool-garbage', async (req, res) => {
    let poolgarbage = await api.poolgarbagecollection().then(x => x)
    res.send(JSON.stringify(poolgarbage))
    return poolgarbage
})
app.get('/send-payment', async (req, res) => {
    let sendpayment = await api.sendpayment(req.query.wallet, req.query.addresses && req.query.addresses.split(',').map(y => new AddressWallet(y)), req.query.amounts.split(',').map(x => +x), req.query.pass, req.query.data ? JSON.parse(req.query.data) : null).then(x => x)
    res.send(JSON.stringify(sendpayment))
    return sendpayment
})
app.get('/cancel-payment', async (req, res) => {
    let cancelpayment = await api.cancelpayment(req.query.wallet, req.query.tx).then(x => x)
    res.send(JSON.stringify(cancelpayment))
    return cancelpayment
})
app.get('/submit-tx', async (req, res) => {
    let submittx = await api.submittx(req.query.wallet, req.query.amounts.split(',').map(x => +x), req.query.data ? JSON.parse(req.query.data) : null, req.query.phrase)
    res.send(JSON.stringify(submittx))
    return submittx
})
app.get('/mint', async (req, res)=>{
    // id, addresses, data, name, maxsupply, phrase
    let mint = await api.mint(req.query.id, req.query.addresses && req.query.addresses.split(',').map(y => new AddressWallet(y)), req.query.data ? JSON.parse(req.query.data) : null, req.query.name, req.query.maxsupply, req.query.phrase).then(x=>x).catch(e=>e)
    res.send(JSON.stringify(mint))
})

http.createServer(app).listen(port, () => {
    console.log(`Example app listening at http://shwifty.io/`)
})
https.createServer({
    key: fs.readFileSync('keys/key.pem'),
    cert: fs.readFileSync('keys/cert.pem')
}, app).listen(portssl, () => {
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
