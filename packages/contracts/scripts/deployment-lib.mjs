export function validateNetwork(value) {
  if (!['studionet', 'testnet-asimov'].includes(value)) throw new Error(`Unsupported deployment network: ${value}`);
  return value;
}

export function normalizePrivateKey(value) {
  const clean = String(value ?? '').trim().replace(/^0x/i, '');
  if (!clean) throw new Error('DEPLOYER_PRIVATE_KEY is required; deployment never substitutes another wallet.');
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) throw new Error('DEPLOYER_PRIVATE_KEY must contain exactly 64 hex characters.');
  return `0x${clean}`;
}

function realAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value)) && !/^0x0{40}$/i.test(String(value));
}

function realTransaction(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value)) && !/^0x0{64}$/i.test(String(value));
}

export function validateManifest(value) {
  if (!value || typeof value !== 'object') throw new Error('Deployment manifest must be an object.');
  if (value.schemaVersion !== 1 || value.project !== 'ProofOfPost') throw new Error('Deployment manifest identity is invalid.');
  validateNetwork(value.network);
  if (value.classification !== 'INTENTIONALLY_FROZEN') throw new Error('Contract classification must be INTENTIONALLY_FROZEN.');
  if (!realAddress(value.contractAddress)) throw new Error('Deployment manifest contract address is missing, zero, or a placeholder.');
  if (!realAddress(value.deployer)) throw new Error('Deployment manifest deployer address is invalid.');
  if (!realTransaction(value.deploymentTransaction)) throw new Error('Deployment manifest transaction hash is missing or invalid.');
  if (!/^sha256:[0-9a-f]{64}$/i.test(String(value.sourceHash))) throw new Error('Deployment manifest source hash is invalid.');
  if (!Array.isArray(value.constructorArgs)) throw new Error('Deployment manifest constructor args must be an array.');
  if (Number.isNaN(Date.parse(String(value.deployedAt)))) throw new Error('Deployment manifest deployedAt is invalid.');
  return value;
}

export function extractContractAddress(receipt) {
  const address = receipt?.data?.contract_address ?? receipt?.data?.contractAddress ?? receipt?.txDataDecoded?.contractAddress ?? receipt?.contract_address;
  if (!realAddress(address)) throw new Error('Finalized deployment receipt did not contain a real contract address.');
  return address;
}
