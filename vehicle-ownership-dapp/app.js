/* AutoLedger DApp frontend for the VehicleOwnership.sol contract. */
const ABI = [
  "function registerVehicle(string _vin, string _registrationNumber, string _model)",
  "function transferOwnership(string _vin, address _newOwner)",
  "function getVehicle(string _vin) view returns (string, string, string, address)",
  "function getTransferCount(string _vin) view returns (uint256)",
  "function getTransferAt(string _vin, uint256 index) view returns (address, address, uint256)",
  "event VehicleRegistered(string vin, address indexed owner)",
  "event OwnershipTransferred(string vin, address indexed previousOwner, address indexed newOwner, uint256 timestamp)"
];

let provider = null;
let signer = null;
let contract = null;
let connectedAddress = null;
let toastTimer = null;
const $ = (id) => document.getElementById(id);

function notify(message, isError = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 4200);
}
function setStatus(message, kind = '') {
  $('connectionStatus').textContent = message;
  $('connectionStatus').className = `status-line ${kind}`.trim();
}
function shortAddress(address) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
function row(key, value, address = false) {
  const el = document.createElement('div');
  el.className = 'result-row';
  const k = document.createElement('span'); k.className = 'key'; k.textContent = key;
  const v = document.createElement('span'); v.className = `value${address ? ' address' : ''}`; v.textContent = value ?? '—';
  if (address && typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)) v.title = value;
  el.append(k, v); return el;
}
function ensureContract() {
  if (!window.ethereum) throw new Error('MetaMask was not detected. Install or enable the MetaMask browser extension.');
  if (!contract) throw new Error('Load your deployed contract address first.');
  return contract;
}
async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error('MetaMask was not detected. Install or enable the MetaMask browser extension.');
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();
    const network = await provider.getNetwork();
    $('connectBtn').textContent = shortAddress(connectedAddress);
    $('networkPill').textContent = `${network.name === 'unknown' ? 'EVM network' : network.name} · ${shortAddress(connectedAddress)}`;
    $('networkPill').className = 'pill connected';
    setStatus(`Wallet connected: ${connectedAddress}. Check that this is the same network where you deployed the contract.`, 'success');
    if ($('contractAddress').value.trim()) loadContract();
  } catch (err) { handleError(err); }
}
function loadContract() {
  try {
    if (!provider || !signer) throw new Error('Connect your wallet first.');
    const address = $('contractAddress').value.trim();
    if (!ethers.isAddress(address)) throw new Error('Enter a valid deployed contract address beginning with 0x.');
    contract = new ethers.Contract(address, ABI, signer);
    setStatus(`Contract loaded at ${address}. Network and contract address must match your Remix deployment.`, 'success');
    notify('Contract loaded. You can now use the registry.');
  } catch (err) { contract = null; handleError(err); }
}
function handleError(err) {
  let message = err?.shortMessage || err?.reason || err?.message || 'Something went wrong.';
  if (message.includes('user rejected') || message.includes('User denied')) message = 'Transaction was rejected in your wallet.';
  else if (message.includes('Vehicle already registered')) message = 'This VIN is already registered. Use a different VIN or look up the existing vehicle.';
  else if (message.includes('Only current owner can transfer')) message = 'Transfer rejected: the connected wallet is not the current owner.';
  else if (message.includes('Vehicle not registered')) message = 'No vehicle is registered with that VIN on this contract.';
  else if (message.includes('could not decode result data') || message.includes('BAD_DATA')) message = 'Could not read a vehicle record. Check the contract address, network, and VIN.';
  setStatus(message, 'error'); notify(message, true); console.error(err);
}
async function waitForTx(tx) {
  setStatus(`Transaction submitted: ${tx.hash}. Waiting for confirmation…`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error('Transaction failed or was reverted.');
  const network = await provider.getNetwork();
  setStatus(`Transaction confirmed in block ${receipt.blockNumber} on chain ${network.chainId}. Hash: ${receipt.hash}`, 'success');
  notify(`Transaction confirmed · block ${receipt.blockNumber}`);
  return receipt;
}

$('connectBtn').addEventListener('click', connectWallet);
$('loadContractBtn').addEventListener('click', loadContract);
$('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const c = ensureContract();
    const vin = $('regVin').value.trim();
    const reg = $('regNumber').value.trim();
    const model = $('regModel').value.trim();
    if (!vin || !reg || !model) throw new Error('Fill in all vehicle fields.');
    const tx = await c.registerVehicle(vin, reg, model);
    await waitForTx(tx);
    $('lookupVin').value = vin; $('historyVin').value = vin;
    await lookupVehicle(vin); await lookupHistory(vin);
  } catch (err) { handleError(err); }
});
$('transferForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const c = ensureContract();
    const vin = $('transferVin').value.trim();
    const recipient = $('newOwner').value.trim();
    if (!vin) throw new Error('Enter the vehicle VIN.');
    if (!ethers.isAddress(recipient)) throw new Error('New owner must be a valid 0x wallet address, not a name or city.');
    if (connectedAddress && recipient.toLowerCase() === connectedAddress.toLowerCase()) throw new Error('Recipient is the connected wallet. Enter a different owner address.');
    const tx = await c.transferOwnership(vin, recipient);
    await waitForTx(tx);
    $('lookupVin').value = vin; $('historyVin').value = vin;
    await lookupVehicle(vin); await lookupHistory(vin);
  } catch (err) { handleError(err); }
});
async function lookupVehicle(vin) {
  const c = ensureContract();
  const data = await c.getVehicle(vin);
  const result = $('vehicleResult'); result.className = 'result-card'; result.replaceChildren(
    row('VIN', data[0]), row('Registration No.', data[1]), row('Model', data[2]), row('Current owner', data[3], true), row('Your wallet', connectedAddress || 'Not connected', true)
  );
}
$('lookupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await lookupVehicle($('lookupVin').value.trim()); } catch (err) { handleError(err); }
});
async function lookupHistory(vin) {
  const c = ensureContract();
  const count = Number(await c.getTransferCount(vin));
  const result = $('historyResult'); result.replaceChildren();
  if (count === 0) { result.className = 'result-placeholder'; result.textContent = 'No history entries found.'; return; }
  result.className = 'timeline';
  // Display newest entry first, while preserving the contract's original index in each label.
  for (let i = count - 1; i >= 0; i--) {
    const record = await c.getTransferAt(vin, i);
    const item = document.createElement('div'); item.className = 'timeline-item';
    const title = document.createElement('strong'); title.textContent = i === 0 ? `Initial registration · record ${i}` : `Ownership transfer · record ${i}`;
    const previous = document.createElement('p'); previous.textContent = `From: ${record[0]}`;
    const next = document.createElement('p'); next.textContent = `To: ${record[1]}`;
    const time = document.createElement('time');
    const date = new Date(Number(record[2]) * 1000);
    time.textContent = Number(record[2]) === 0 ? 'Timestamp unavailable' : `${date.toLocaleString()} · Unix ${record[2].toString()}`;
    item.append(title, previous, next, time); result.append(item);
  }
}
$('historyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await lookupHistory($('historyVin').value.trim()); } catch (err) { handleError(err); }
});
if (window.ethereum) {
  window.ethereum.on?.('accountsChanged', () => { provider = null; signer = null; contract = null; connectedAddress = null; $('connectBtn').textContent = 'Connect wallet'; $('networkPill').textContent = 'Wallet changed'; $('networkPill').className = 'pill muted'; setStatus('Wallet account changed. Reconnect and reload the contract.'); });
  window.ethereum.on?.('chainChanged', () => { window.location.reload(); });
}
