(async ()=>{const { WalletServer, Seed, AssetWallet, TokenWallet } = require('cardano-wallet-js');
    let walletServer = WalletServer.init('http://localhost:8090/v2')

    let information = await walletServer.getNetworkInformation().then(x=>x);
return console.log(information)
})()

