var fs = require('fs')
var http = require('http')
var https = require('https')
// const fetch = require('node-fetch')
const express = require('express')
const { exec } = require("child_process")
var cors = require('cors')
var qr = require('qrcode')
const { WalletServer, Seed, AssetWallet, TokenWallet, AddressWallet } = require('cardano-wallet-js');
const { config } = require('process')
const app = express()
app.use(cors())
const port = 80
const portssl = 443
const crypto = require("crypto-js");

const format = {
    stringify(cipherParams) {
        // create json object with ciphertext
        var jsonObj = { ct: cipherParams.ciphertext.toString(crypto.enc.Hex) };

        // optionally add iv or salt
        if (cipherParams.iv) {
            jsonObj.iv = cipherParams.iv.toString();
        }

        if (cipherParams.salt) {
            jsonObj.s = cipherParams.salt.toString();
        }
        // stringify json object
        return jsonObj.ct + '_' + jsonObj.iv + '_' + jsonObj.s;
    },
    parse(jsonStr) {
        // parse json string
        let encarray = jsonStr.split('_')
        console.log('parsing it out', encarray);
        // var jsonObj = JSON.parse(jsonStr);

        // extract ciphertext from json object, and create cipher params object
        var cipherParams = crypto.lib.CipherParams.create({
            ciphertext: crypto.enc.Hex.parse(encarray[0])
        });

        // optionally extract iv or salt

        if (encarray[1]) {
            cipherParams.iv = crypto.enc.Hex.parse(encarray[1]);
        }

        if (encarray[2]) {
            cipherParams.salt = crypto.enc.Hex.parse(encarray[2]);
        }
        return cipherParams;
    }
}

const testnet = false;
let cconfig;
if (testnet) {
    cconfig = { // https://hydra.iohk.io/build/6498473/download/1/testnet-shelley-genesis.json
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
} else {
    cconfig = {
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
        },
        "genDelegs": {
            "ad5463153dc3d24b9ff133e46136028bdc1edbb897f5a7cf1b37950c": {
                "delegate": "d9e5c76ad5ee778960804094a389f0b546b5c2b140a62f8ec43ea54d",
                "vrf": "64fa87e8b29a5b7bfbd6795677e3e878c505bc4a3649485d366b50abadec92d7"
            },
            "b9547b8a57656539a8d9bc42c008e38d9c8bd9c8adbb1e73ad529497": {
                "delegate": "855d6fc1e54274e331e34478eeac8d060b0b90c1f9e8a2b01167c048",
                "vrf": "66d5167a1f426bd1adcc8bbf4b88c280d38c148d135cb41e3f5a39f948ad7fcc"
            },
            "60baee25cbc90047e83fd01e1e57dc0b06d3d0cb150d0ab40bbfead1": {
                "delegate": "7f72a1826ae3b279782ab2bc582d0d2958de65bd86b2c4f82d8ba956",
                "vrf": "c0546d9aa5740afd569d3c2d9c412595cd60822bb6d9a4e8ce6c43d12bd0f674"
            },
            "f7b341c14cd58fca4195a9b278cce1ef402dc0e06deb77e543cd1757": {
                "delegate": "69ae12f9e45c0c9122356c8e624b1fbbed6c22a2e3b4358cf0cb5011",
                "vrf": "6394a632af51a32768a6f12dac3485d9c0712d0b54e3f389f355385762a478f2"
            },
            "162f94554ac8c225383a2248c245659eda870eaa82d0ef25fc7dcd82": {
                "delegate": "4485708022839a7b9b8b639a939c85ec0ed6999b5b6dc651b03c43f6",
                "vrf": "aba81e764b71006c515986bf7b37a72fbb5554f78e6775f08e384dbd572a4b32"
            },
            "2075a095b3c844a29c24317a94a643ab8e22d54a3a3a72a420260af6": {
                "delegate": "6535db26347283990a252313a7903a45e3526ec25ddba381c071b25b",
                "vrf": "fcaca997b8105bd860876348fc2c6e68b13607f9bbd23515cd2193b555d267af"
            },
            "268cfc0b89e910ead22e0ade91493d8212f53f3e2164b2e4bef0819b": {
                "delegate": "1d4f2e1fda43070d71bb22a5522f86943c7c18aeb4fa47a362c27e23",
                "vrf": "63ef48bc5355f3e7973100c371d6a095251c80ceb40559f4750aa7014a6fb6db"
            }
        },
        "updateQuorum": 5,
        "networkId": "Mainnet",
        "initialFunds": {},
        "maxLovelaceSupply": 45000000000000000,
        "networkMagic": 764824073,
        "epochLength": 432000,
        "systemStart": "2017-09-23T21:44:51Z",
        "slotsPerKESPeriod": 129600,
        "slotLength": 1,
        "maxKESEvolutions": 62,
        "securityParam": 2160
    }
}
const cardanoconfig = cconfig
let docs = (() => {
    let api = {}
    api[`encipher`] = { example: `/encipher?msg=somemessage&pass=somepass` }
    api[`decipher`] = { example: `/decipher` }
    api[`docs`] = { example: `/docs` }
    api[`qr`] = { example: `/qr?address=addr1q87cmda6w8dvvqpt7m3t3wpqvucn0jyap2g484dhxe7x72d7fv9x2q6avt5qk480fev7uq5dkhq6q2qu006uu5tlt8ysgzmdy3&amount=1` }
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
    // api[`delete-wallet`] = { example: ` /delete-wallet?wallet=$ID` }
    api[`stop-delegate`] = { example: `/stop-delegate?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&pass=xymbacardano` }
    api[`change-password`] = { example: `/change-password?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&oldpass=xymbacardano&newpass=xymbacardanowalletbro` }
    api[`withdraw-rewards`] = { example: `/withdraw-rewards?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&pass=xymbacardano` }
    api[`pool-actions`] = { example: `/pool-actions` }
    api[`pool-garbage`] = { example: `/pool-garbage` }
    api[`get-txs`] = { example: `/get-txs?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d` }
    api[`send-payment`] = { example: `/send-payment?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&addresses=addr_test1qzu06fxmkc5hgjxcucuhlx5rwgnphnf6cj3t4gpukp5dkyag39uppmtwkm39f95szc4km6k09ghrn78vthusckne79js6xn5dj&amounts=5555555&pass=xymbacardano&data={"sup":"world"}` }
    api[`cancel-payment`] = { example: `/cancel-payment?wallet=b112d4a931cd6c51bc04ec2b54112a220e66406d&&tx=11b880e7bb7f30badf8919446f2416d7c1f6724d8add948308afd7662161c493` }
    api[`submit-tx`] = { example: `/submit-tx?wallet=22283c232d1d71829ce14ea3a1924c3e5c4ee522&amounts=3333333&data={"1":{"id":"love","scope":"cardano","refid":"0x"}}&phrase=grow,doll,joy,ceiling,cage,once,task,soup,fitness,one,recycle,tower,shrug,dentist,fever` }
    api[`mint`] = { example: `/mint?id=b112d4a931cd6c51bc04ec2b54112a220e66406d&addresses=addr_test1qzu06fxmkc5hgjxcucuhlx5rwgnphnf6cj3t4gpukp5dkyag39uppmtwkm39f95szc4km6k09ghrn78vthusckne79js6xn5dj&data={"1":{"id":"love","scope":"cardano","refid":"0x"}}&name=xymbabro&maxsupply=2&phrase=grow,doll,joy,ceiling,cage,once,task,soup,fitness,one,recycle,tower,shrug,dentist,fever` }
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
        return Seed.getKeyHash(key)
    },
    buildscript(keyhash) { return Seed.buildSingleIssuerScript(keyhash) },
    buildtx(coins, ttl, meta, tokens) { return Seed.buildTransaction(coins, ttl, meta, tokens) },
    buildtxmeta(data) { return Seed.buildTransactionMetadata(data) },
    buildtxmint(coinselection, ttl, tokens, keys, data) {
        // console.log('building mint tx', JSON.stringify([coinselection, ttl, tokens, keys, data, cardanoconfig], null, 2));
        // console.log('building tx mint\n', { coinselection, ttl, tokens, keys, data });
        // console.log(Seed.buildTransactionWithToken(coinselection, ttl, tokens, keys, {data: data, config: cardanoconfig}))
        // console.log('building tx mint', keys);
        let build = Seed.buildTransactionWithToken(coinselection, ttl, tokens, keys, { data: data, config: cardanoconfig })
        console.log('build', { build });
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
        if (!option) {
            option = 'unused'
        }
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
    // async deletewallet(id) {
    //     let wallet = await api.getwallet(id).then(x => x)
    //     return await wallet.delete();
    // },
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
        console.log({ id, addresses, amounts, pass, meta });
        let wallet = await api.getwallet(id).then(x => x).catch(e => e)
        console.log(wallet);
        return await wallet.sendPayment(pass, addresses, amounts, meta).then(x => x).catch(e => e);
    },
    async cancelpayment(id, txid) { // BROKEN.. function undefined
        let wallet = await api.getwallet(id).then(x => x)
        console.log(Object.keys(wallet))
        return wallet.forgetTransaction(txid)
    },
    async submittx(id, amounts, meta, phrase, address) {
        console.log({ id, amounts, meta, phrase, address });
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
        console.log(coinselection.outputs);
        address ? coinselection.outputs[0].address = address : null
        console.log(coinselection.outputs);
        let txBody, txBuild
        if (meta !== null) {
            let metadata = Seed.buildTransactionMetadata(JSON.parse(JSON.stringify(meta)))
            txBuild = Seed.buildTransaction(coinselection, ttl, { metadata, config: cardanoconfig });
            txBody = Seed.sign(txBuild, signingkeys, metadata);
        } else {
            txBuild = Seed.buildTransaction(coinselection, ttl);
            txBody = Seed.sign(txBuild, signingkeys);
        }
        let signed = Buffer.from(txBody.to_bytes()).toString('hex');
        console.log(signed);
        return await walletserver.submitTx(signed).then(x => x).catch(e => e)
    },
    derivekey(phrase, path) { return Seed.deriveKey(phrase, path).to_raw_key(); },
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
    async mint(id, address, meta, name, supply, phrase) {
        console.log({ id, address, meta, name, supply, phrase });
        // address to hold the minted tokens. You can use which you want.
        let walletserver = api.connect()
        let wallet = await api.getwallet(id).then(x => x)
        let addresses
        if (address) {addresses = address}
        else { 
            addresses = [await api.listaddresses(id, 'unused').then(x => x.slice(0, 1)[0].id)] 
            console.log(await addresses);
        }
        console.log(address == true, {address}, {addresses});
        // let addresses = address !== undefined && || [await wallet.getAddresses()[0]];

        // blockchain config, this is where you can find protocol params, slotsPerKESPeriod etc.
        // This lib comes with  Mainnet, Testnet and LocalCluster config (Config.Mainnet, Config.Testnet and Config.LocalCluster), but you may consider provide your own to make sure they are up to date.
        // You can find the latest config files here: https://hydra.iohk.io/build/6498473/download/1/index.html
        // let config = { ..., "protocolParams": {... "minFeeA": 44, ..., "minFeeB": 155381, ...} }

        // policy public/private keypair
        let keyPair = Seed.generateKeyPair();
        let policyVKey = keyPair.publicKey;
        let policySKey = keyPair.privateKey;

        // generate single issuer native script
        let keyHash = Seed.getKeyHash(policyVKey);
        let script = Seed.buildSingleIssuerScript(keyHash);

        //generate policy id
        let scriptHash = Seed.getScriptHash(script);
        let policyid = Seed.getPolicyId(scriptHash);

        // metadata
        let data = {};
        let tokenData = {"721":{}}
        tokenData['721'][policyid] = Object.keys(meta).length > 0 && { [name]: meta } || {
            1: {
                name: "XYMBOL TOKENS (BETA)",
                description: "Beta governance tokens",
                type: "DAO",
                xymid: "453130b4b8a21eb7742e8f16d63bda33a520e54ae1122c41bca6b7bf77580f91",
                xymbatype: "token",
                count: 19683
            }
        };
        data[0] = JSON.parse(JSON.stringify(tokenData));

        // asset
        let asset = new AssetWallet(policyid, name, supply);

        // token
        let tokens = [new TokenWallet(asset, script, [keyPair])];

        //scripts
        let scripts = tokens.map(t => t.script);

        // get min ada for address holding tokens
        let minAda = Seed.getMinUtxoValueWithAssets([asset], cconfig);
        let amounts = [minAda];

        // get ttl info
        let info = await walletserver.getNetworkInformation();
        let ttl = info.node_tip.absolute_slot_number * 12000;
        // get coin selection structure (without the assets)
        let coinSelection = await wallet.getCoinSelection(addresses, amounts, data);

        // add signing keys
        let rootKey = phrase.includes(',') ? Seed.deriveRootKey(phrase.split(',')) : Seed.deriveRootKey(phrase.split(' '))
        // let rootKey = Seed.deriveRootKey(phrase.split(','));
        let signingKeys = coinSelection.inputs.map(i => {
            let privateKey = Seed.deriveKey(rootKey, i.derivation_path).to_raw_key();
            return privateKey;
        });

        // add policy signing keys
        tokens.filter(t => t.scriptKeyPairs).forEach(t => signingKeys.push(...t.scriptKeyPairs.map(k => k.privateKey.to_raw_key())));

        let metadata = Seed.buildTransactionMetadata(data);

        // the wallet currently doesn't support including tokens not previuosly minted
        // so we need to include it manually.
        coinSelection.outputs = coinSelection.outputs.map(output => {
            if (output.address === addresses[0].address) {
                output.assets = tokens.map(t => {
                    let asset = {
                        policy_id: t.asset.policy_id,
                        asset_name: Buffer.from(t.asset.asset_name).toString('hex'),
                        quantity: t.asset.quantity
                    };
                    return asset;
                });
            }
            return output;
        });

        // we need to sing the tx and calculate the actual fee and the build again 
        // since the coin selection doesnt calculate the fee with the asset tokens included
        console.log({ coinSelection: JSON.stringify(coinSelection) });
        let txBody = Seed.buildTransactionWithToken(coinSelection, ttl, tokens, signingKeys, { data: data, config: cconfig });
        let tx = Seed.sign(txBody, signingKeys, metadata, scripts);
        console.log({ tx, txBody });
        // submit the tx	
        let signed = Buffer.from(tx.to_bytes()).toString('hex');
        console.log(1, { signed, tx, txBody, metadata, signingKeys, rootKey, coinSelection });
        // return {id, addresses, meta, name, maxsupply, phrase, signed, tx, txBody, metadata, signingKeys, rootKey, coinSelection}
        let txid = await walletserver.submitTx(signed);
        // let txId = await api.submittx(signed).then(x => x).catch(e => { return { signed, tx, txBody, metadata, signingKeys, rootKey, coinSelection, wallet, e: e.response.data } });

        // console.log({ txId })
        return { policyid, txid }

    },
    decryptphrase(emsg, pass) {
        if (!pass) { const pass = fs.readFileSync(`./keys/phrase.password`, { encoding: 'utf8', flag: 'r' }) }
        // console.log('wait', {emsg, pass});
        const decrypted = crypto.AES.decrypt(emsg, pass, { format });
        // console.log({d: decrypted.toString(crypto.enc.Utf8)});
        return decrypted.toString(crypto.enc.Utf8);
    },
    encryptphrase(phrase, pass) {
        if (!pass) { const pass = fs.readFileSync(`./keys/phrase.password`, { encoding: 'utf8', flag: 'r' }) }
        const encrypted = crypto.AES.encrypt(phrase, pass, { format });
        // fs.writeFileSync('./crypto.hash', encrypted.toString())
        return encrypted.toString();
    }
}

app.get('/', (req, res) => {
    let obj = '<ul>'
    Object.entries(docs).map(z => {
        obj += `<li style=" align-items:center;"><b>${z[0]}</b><br><br>`
        obj += '<div style="overflow-wrap: anywhere;">Example<br><a href="' + encodeURI(z[1].example) + '">' + z[1].example + '</a></div><br>'
        obj += Object.keys(api).includes(z[0].replace('-', '')) ? `Code<br><code style="font: 12px mono; white-space: pre-wrap; background: rgba(0,0,0,.03); padding: 8px">` + api[z[0].replace('-', '')].toString() + `</code><br>` : ''
        obj += '<br></li>'
    })
    return res.send(obj + '</ul>')
})

app.get('/docs', (req, res) => res.send(JSON.stringify(docs, null, 4)))
app.get('/decipher', (req, res) => { // U2FsdGVkX19QmUjIcqEcPO0LTkSxXvyJdIbNeFZ+zzA= // U2FsdGVkX1+Osd6i8rucT/h+hIOvC/HkzaNTHOgQK7A=
    let [emsg, pass] = [req.query.emsg, req.query.pass]
    console.log({ emsg, pass });
    const d = api.decryptphrase(emsg, pass)
    res.send(d)
})
app.get('/encipher', (req, res) => {
    let [msg, pass] = [req.query.msg, req.query.pass]
    console.log({ msg, pass });
    const h = api.encryptphrase(msg, pass)
    console.log({ h });
    res.send(h)
})

app.get('/qr', async (req, res) => {
    let address, amount;
    if (req.query.amountid) { // amountid is adding an amount of lovelace to the amount and sending it back for confirmation convenience and some identity protection if multiple hits come to an unused address.
        let random = Math.floor(Math.random() * (9999 - 1000) + 1000);
        amount = +req.query.amount + +('.00'+random)
    } else {amount = req.query.amount}
    if (!req.query.address) {
        const walletid = '00397bdb4493693300bf39d44cfc16da97210c06'
        const raddress = await api.listaddresses(walletid, 'unused').then(x => x.slice(0, 1))
        address = raddress[0].id
    } else {address = req.query.address}
    
    let gurl = `web+cardano:${address}?amount=${amount}`
    return qr.toDataURL(gurl, function (err, img) {
        let html = `<img src="${img}"><p style="overflow-wrap: anywhere;">${gurl}</p>`
        res.send(html)
        return html
    })
})
app.get('/network', (req, res) => res.send(JSON.stringify(api.connect())))
app.get('/network-info', async (req, res) => {
    console.log(api.networkinfo, Object.keys(req))
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

// app.get('/delete-wallet', async (req, res) => {
//     let deletedwallet = await api.deletewallet(req.query.wallet).then(x => x).catch(e => e)
//     res.send(JSON.stringify(deletedwallet))
//     return deletedwallet
// })
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
    console.log(JSON.stringify(req.query, null, 4));
    let sendpayment = await api.sendpayment(req.query.wallet, req.query.address && req.query.address.split(',').map(y => new AddressWallet(y)), req.query.amounts.split(',').map(x => +x), req.query.secret, req.query.data ? JSON.parse(req.query.data) : null).then(x => x)
    console.log({ sendpayment });
    res.send(JSON.stringify(sendpayment))
    return sendpayment
})
app.get('/cancel-payment', async (req, res) => {
    let cancelpayment = await api.cancelpayment(req.query.wallet, req.query.tx).then(x => x)
    res.send(JSON.stringify(cancelpayment))
    return cancelpayment
})
app.get('/submit-tx', async (req, res) => {
    let phrase;
    if (!req.query.phrase && req.query.secret) {
        const emsg = fs.readFileSync(`./crypto.hash`, { encoding: 'utf8', flag: 'r' })
        phrase = api.decryptphrase(emsg, req.query.secret)
        console.log(phrase);
    } else { phrase = req.query.phrase }
    let submittx = await api.submittx(req.query.wallet, req.query.amounts.split(',').map(x => +x), req.query.data ? JSON.parse(req.query.data) : null, phrase, req.query.address)
    res.send(JSON.stringify(submittx))
    return submittx
})
app.get('/mint', async (req, res) => {
    // id, addresses, data, name, supply, phrase
    console.log({req: req.query});
    let phrase
    if (!req.query.phrase && req.query.secret) {
        const emsg = fs.readFileSync(`./crypto.hash`, { encoding: 'utf8', flag: 'r' })
        phrase = api.decryptphrase(emsg, req.query.secret)
        console.log(phrase, JSON.stringify(req.query.data, null, 4));
    } else { phrase = req.query.phrase }
    // id, addresses, meta, name, supply, phrase
    let mint = await api.mint(req.query.id, req.query.address && req.query.address.split(',').map(y => new AddressWallet(y)) || null, JSON.parse(req.query.data), req.query.name, req.query.supply, phrase).then(x => x).catch(e => e)
    console.log({mint});
    res.send(`<p style="white-space: pre-wrap; overflow-wrap: anywhere;">${JSON.stringify(mint, null, 4)}</p>`)
})

http.createServer(app).listen(port, () => {
    console.log(`Example app listening at http://shwifty.io/`)
})
https.createServer({
    key: fs.readFileSync('./keys/key.pem'),
    cert: fs.readFileSync('./keys/cert.pem')
}, app).listen(portssl, () => {
    console.log(`Example ssl app listening at https://shwifty.io/`)
})
