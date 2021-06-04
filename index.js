var fs = require('fs')
var http = require('http')
var https = require('https')
const express = require('express')
const app = express()
const port = 80
const portssl = 443

app.get('/', (req, res) => {
  res.send('Hello World! We will be minting soon.')
})
app.get('/test', (req, res)=>res.send('endpoint works!'))
app.get('/cardano', async (req, res) => {
let a = (async () => {
    const { WalletServer, Seed, AssetWallet, TokenWallet } = require('cardano-wallet-js');
    let walletServer = WalletServer.init('http://localhost:8090/v2')

    let information = await walletServer.getNetworkInformation();
    console.log('\nBlockchain Information', information);

    let parameters = await walletServer.getNetworkParameters();
    console.log('\nBlockchain Parameters', parameters);

    let clock = await walletServer.getNetworkClock();
    console.log('\nBlockchain Clock', clock);

    let recoveryPhrase = Seed.generateRecoveryPhrase();
    let mnemonic_sentence = Seed.toMnemonicList(recoveryPhrase);
    console.log('\nRecovery Phrase',recoveryPhrase, mnemonic_sentence)
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
    let keyPair = Seed.generateKeyPair();
    let policyVKey = keyPair.publicKey;
    let policySKey = keyPair.privateKey;

    console.log('policy keys', {policyVKey, policySKey});

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
    let amounts = [minAda];
    console.log('amounts', amounts);

    // get ttl info
//  let info = await walletServer.getNetworkInformation();
    let ttl = information.node_tip.absolute_slot_number * 12000;

    console.log('ttl', ttl);
    // get coin selection structure (without the assets)
    let coinSelection = await xymbawallet.getCoinSelection(addresses, amounts, data).then(x=>x).catch(e=>e);
    console.log('coinSelection', coinSelection.response.status, coinSelection.response.data);

    // add signing keys
    let rootKey = Seed.deriveRootKey('tank kind bike insect sister legend gown lava clinic music bid opera daring switch salmon');
    if(!coinSelection.inputs) return {information, xymbawallet, addresses, asset, tokens}
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
	let cardano = async () => await a.then(x=>JSON.stringify(x, null, 2))
	let resdata = cardano()
	console.log(resdata)
	res.send(await resdata)
})
http.createServer(app).listen(port, () => {
  console.log(`Example app listening at http://shwifty.io/`)
});
https.createServer({
  key: fs.readFileSync('ssl/privkey.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
}, app).listen(portssl, () => {
  console.log(`Example ssl app listening at https://shwifty.io/`)
})

