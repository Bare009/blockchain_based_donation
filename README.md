# Blockchain Donation Tracker

A decentralized donation tracking app with milestone-based fund release.

## Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension

## Setup

1) Install dependencies

```shell
npm install
```

2) Compile the contract

```shell
npx hardhat compile
```

3) Copy the ABI to the frontend

```shell
node scripts/copy-abi.js
```

## Local Chain + Wallet Setup (Manual)

1) Start the local Hardhat node (keep this running)

```shell
npx hardhat node
```

2) Import accounts into MetaMask

From the Hardhat node output, import these private keys:

- Account 0 = Admin
- Account 1 = Verifier
- Account 2 = Donor

3) Add the local network to MetaMask

- Network name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency symbol: ETH

## Deploy the Contract

In a second terminal (leave the node running):

```shell
npx hardhat run scripts/deploy.js --network localhost
```

This writes the deployed address to `frontend/contract-address.json`.

## Run the Frontend

Serve the frontend over HTTP (MetaMask requires http/https):

```shell
npx http-server frontend -p 3000
```

Open http://localhost:3000 and click "Connect Wallet".

## Running Tests

```shell
npx hardhat test
```

## Demo Reset (Fresh State)

If totals look incorrect, you are likely pointing at an old deployment.

1) Stop the Hardhat node
2) Start it again: `npx hardhat node`
3) Redeploy: `npx hardhat run scripts/deploy.js --network localhost`
4) Refresh the browser

## Project Structure

- `contracts/DonationTracker.sol` - Smart contract
- `scripts/deploy.js` - Deployment script
- `scripts/copy-abi.js` - ABI copy helper
- `test/DonationTracker.test.js` - Contract tests
- `frontend/` - HTML/CSS/JS frontend
