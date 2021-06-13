
***
sudo setcap cap_net_bind_service=+ep ~/.nvm/versions/node/v14.17.0/bin/node
### which node to get node installation path
sudo apt-get install libcap2-bin
***

# Research
## Tech
https://stackoverflow.com/questions/6160283/file-encryption-into-n-files-but-with-at-least-and-only-m-required-to-decrypt
https://en.wikipedia.org/wiki/Secret_sharing
    -- https://github.com/karlgluck/ThresholdJS
    -- https://github.com/grempe/secrets.js

## NFT Metadata 
https://github.com/onflow/flow-nft/issues/9
https://schema.org/docs/schemas.html
https://github.com/interNFT/nft-rfc
https://www.arweave.org/
https://www.reddit.com/r/CardanoDevelopers/comments/mkhlv8/nft_metadata_standard/
https://nftschool.dev/reference/metadata-schemas/#ethereum-and-evm-compatible-chains
https://github.com/Berry-Pool/NFT-Metadata-Standard-CIP/blob/main/CIP-MetadataTokenLink.md
https://nomicon.io/Standards/NonFungibleToken/Metadata.html

## Parallel Projects
https://www.cnft.io/
https://www.nft-maker.io/ 
    -- https://www.nft-maker.io/static/metadata_schema.json
https://www.nft-dao.org/
https://professorcardano.com/
https://lovada.art/
https://somint.art/Blueprint

## Creatives
https://cardanobits.art/
https://www.sushibyte.io/
https://www.cardanokidz.com/
https://professorcardano.com/
https://spacebudz.io/

# Installation

## Server setup and configs for Ubuntu 20 lts on gCloud

### install docker
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
curl https://get.docker.com | sh
sudo usermod -aG docker $USER

### install node.js and deps
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
. ./.bashrc
sudo apt-get install build-essential
sudo apt-get install libssl-dev
nvm install --lts
nvm use --lts

### grab and install node.js server code
git clone https://github.com/34r7h/cardano-api-server.git
cd cardano-api-server
npm i

### create keys for https/ssl
mkdir keys && cd $_
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
cd

### automating startup (pm2 - https://pm2.keymetrics.io/) and restart on errors (nodemon)
npm install pm2 -g
echo "module.exports = {apps: [{script: 'network.sh', watch: '.', exp_backoff_restart_delay: 100},{script: 'server.sh', watch: '.',exp_backoff_restart_delay: 100}]};" >> ecosystem.config.js
pm2 startup
npm i nodemon -g

### setup docker folder and download yml for node and wallet servers
mkdir wallet && cd $_
wget https://raw.githubusercontent.com/input-output-hk/cardano-wallet/master/docker-compose.yml
cd

### allow non-root users to start servers on ports 80 / 443
sudo setcap 'cap_net_bind_service=+ep' `which node` 

### create bash scripts for network and server
echo "cd ~/wallet && docker container stop $(docker container ls -q) && NETWORK=testnet docker-compose up" >> network.sh
echo "cd ~/cardano-api-server && nodemon index.js" >> server.sh

pm2 start ecosystem.config.js
pm2 save
sudo reboot

