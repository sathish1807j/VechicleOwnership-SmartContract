# AutoLedger — Vehicle Ownership Transfer DApp

A responsive browser frontend for the `VehicleOwnership.sol` Solidity contract. It uses MetaMask and ethers.js v6, and supports vehicle registration, ownership transfer, current-owner lookup, and ownership history.

## Files

- `index.html` — page structure
- `style.css` — responsive interface styling
- `app.js` — MetaMask connection and smart-contract calls

## Requirements

- Your deployed `VehicleOwnership.sol` contract (the ABI in `app.js` matches the contract provided for this assignment).
- MetaMask browser extension.
- A local Remix VM deployment for a quick demo, or a testnet deployment if required by your faculty.
- Internet connection to load ethers.js and Google Fonts from their CDNs.

## Run it

1. In Remix, compile and deploy `VehicleOwnership.sol`.
2. Copy the deployed contract address from Remix.
3. Open this folder with a local static server. For example, in VS Code install/use Live Server and choose **Open with Live Server** on `index.html`. You can also run `python -m http.server 8000` in this folder and open `http://localhost:8000`.
4. Open MetaMask and select the same network/environment as your deployment. For Remix VM, MetaMask cannot automatically access Remix's in-browser VM accounts; easiest is to use the frontend with a contract deployed on a MetaMask-supported local/test network, or keep testing the contract itself directly in Remix VM.
5. Click **Connect wallet**, approve the connection, paste the deployed contract address, and click **Load contract**.
6. Register a vehicle. The connected wallet becomes its initial owner.
7. To transfer it, enter the VIN and the recipient's valid `0x...` address. Approve the transaction in MetaMask.
8. Use **Find vehicle** and **View history** to verify the updated owner and timeline.

## Important environment note

The Remix VM is a sandbox controlled by Remix, not automatically the same chain as MetaMask. If you deployed only to Remix VM, the frontend cannot interact with that deployment through MetaMask by simply pasting the address. Deploy the contract to a network MetaMask can access (prefer a test network such as Ethereum Sepolia, if your instructor permits), or use Remix's own interface for VM testing.

This educational DApp does not verify legal identity or official registration data. Do not store sensitive personal information on-chain.
