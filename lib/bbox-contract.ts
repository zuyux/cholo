import {
  cvToValue,
  stringAsciiCV,
  uintCV,
  principalCV,
  AnchorMode,
  PostConditionMode,
  deserializeCV,
  serializeCV,
  postConditionToHex,
  standardPrincipalCV,
  noneCV,
  someCV,
  bufferCVFromString,
  ClarityType,
  makeContractCall,
  broadcastTransaction,
  type PostCondition,
  type ClarityValue,
  type ResponseOkCV,
  type UIntCV,
  type OptionalCV,
  type TupleCV,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { getPersistedNetwork, type Network } from './network';
import { getApiUrl } from './stacks-api';
import { getSbtcAssetString, getSBTCContract } from './contracts';

// BBOX Contract addresses per network
const BBOX_CONTRACTS = {
  mainnet: 'SP000000000000000000002Q6VF78.bbox', // Update with actual mainnet address when deployed
  testnet: 'ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.bbox-v2',
  devnet: 'ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.bbox-v2',
};

export const DEFAULT_LISTING_FEE = {
  token: 'sBTC',
  amount: BigInt(100),
};

export type ContractAppRecord = {
  appId: number;
  publisher: string;
  ipfsHash: string;
  status: string;
  verified: boolean;
  featured: boolean;
  totalVotes: number;
  positiveVotes: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: number;
  updatedAt: number;
};

export function getBboxContractAddress(): string {
  const network = getPersistedNetwork();
  return BBOX_CONTRACTS[network] || BBOX_CONTRACTS.testnet;
}

export function getStacksNetwork(): typeof STACKS_MAINNET | typeof STACKS_TESTNET {
  const network = getPersistedNetwork();
  
  if (network === 'mainnet') {
    return STACKS_MAINNET;
  }
  
  // For testnet and devnet
  return STACKS_TESTNET;
}

/**
 * Parse contract address into contract address and contract name
 */
export function parseContractAddress(fullAddress: string): {
  contractAddress: string;
  contractName: string;
} {
  const [contractAddress, contractName] = fullAddress.split('.');
  return { contractAddress, contractName };
}

/**
 * Get the listing fee from the contract
 */
export async function getListingFee(): Promise<{
  token: string;
  amount: bigint;
}> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-listing-fee`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Contract call failed:', response.status, errorText);
      throw new Error(`Failed to fetch listing fee: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the actual response for debugging
    console.log('Contract response:', JSON.stringify(data, null, 2));
    
    // Check if we got a valid result
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid contract response structure:', data);
      throw new Error('Invalid response from contract');
    }
    
    // The result can be either:
    // 1. A Clarity value object with 'type' field (new format)
    // 2. A hex string starting with '0x' (raw Clarity bytes - old format)
    const result = data.result;
    
    let clarityValue;
    if (typeof result === 'string' && result.startsWith('0x')) {
      // Parse hex string to Clarity value
      console.log('📦 Parsing hex-encoded Clarity value:', result);
      try {
        clarityValue = deserializeCV(result);
        console.log('✓ Deserialized Clarity value type:', clarityValue.type);
      } catch (deserializeError) {
        console.error('❌ Failed to deserialize Clarity value:', deserializeError);
        throw new Error('Failed to parse contract response');
      }
    } else if (result && typeof result === 'object' && 'type' in result) {
      // Already a parsed Clarity value object
      console.log('📦 Using pre-parsed Clarity value, type:', result.type);
      clarityValue = result;
    } else {
      console.warn('Result in unexpected format:', result);
      throw new Error('Unexpected contract response format');
    }
    
    // Convert Clarity value to JavaScript object
    const value = cvToValue(clarityValue);
    
    // The contract returns { token: "sBTC", amount: u100 }
    if (!value || typeof value !== 'object') {
      console.warn('Parsed value is not an object:', value);
      throw new Error('Unexpected contract response format');
    }
    
    // Extract amount - cvToValue can return either a primitive or an object with {type, value}
    const rawAmount = (value as Record<string, unknown>).amount;
    const rawToken = (value as Record<string, unknown>).token;
    
    let amountValue: string | number | bigint;
    
    if (typeof rawAmount === 'object' && rawAmount !== null) {
      if ('value' in rawAmount) {
        amountValue = (rawAmount as { value: string | number | bigint }).value;
      } else {
        console.warn('Amount object has unexpected structure:', rawAmount);
        amountValue = String(rawAmount);
      }
    } else {
      amountValue = rawAmount as string | number | bigint;
    }
    
    // Extract token - might also be an object with {type, value}
    let tokenValue: string;
    if (typeof rawToken === 'object' && rawToken !== null) {
      if ('value' in rawToken) {
        tokenValue = String((rawToken as { value: unknown }).value);
      } else {
        console.warn('Token object has unexpected structure:', rawToken);
        tokenValue = String(rawToken);
      }
    } else {
      tokenValue = String(rawToken);
    }
    
    // Convert to BigInt, handling various input types
    const finalAmount = typeof amountValue === 'bigint' 
      ? amountValue 
      : BigInt(String(amountValue));
    
    console.log('✓ Parsed listing fee:', {
      token: tokenValue,
      amount: finalAmount.toString(),
      rawToken: typeof rawToken === 'object' ? JSON.stringify(rawToken) : rawToken,
      rawAmount: typeof rawAmount === 'object' ? JSON.stringify(rawAmount) : rawAmount
    });
    
    return {
      token: tokenValue,
      amount: finalAmount,
    };
  } catch (error) {
    console.warn('Failed to fetch listing fee from contract:', error);
    throw error;
  }
}

/**
 * Get total number of apps from the contract
 */
export async function getTotalApps(): Promise<number> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-total-apps`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch total apps:', response.status);
      return 0;
    }

    const data = await response.json();
    
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid response for total apps');
      return 0;
    }

    const clarityValue = parseResultToClarityValue(data.result);
    const totalValue = cvToValue(clarityValue);
    return toNumber(totalValue);
  } catch (error) {
    console.warn('Error getting total apps (contract may not be deployed):', error);
    return 0;
  }
}

/**
 * Get app details from the contract
 */
export async function getAppFromContract(appId: number): Promise<ContractAppRecord | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-app`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [uintCV(appId)],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch app:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid response for app data');
      return null;
    }

    const clarityValue = parseResultToClarityValue(data.result);
    const tuple = extractAppTuple(clarityValue);
    if (!tuple) {
      return null;
    }

    return tupleToContractAppRecord(tuple, appId);
  } catch (error) {
    console.warn('Error getting app (contract may not be deployed):', error);
    return null;
  }
}

export async function listContractApps(): Promise<ContractAppRecord[]> {
  const total = await getTotalApps();
  if (total <= 0) {
    return [];
  }

  const fetches = Array.from({ length: total }, (_, index) => getAppFromContract(index));
  const results = await Promise.all(fetches);
  return results.filter((app): app is ContractAppRecord => Boolean(app));
}

interface SubmitAppContractOptions {
  ipfsHash: string;
  listingFee?: { token: string; amount: bigint } | null;
}

type BboxContractCallOptions = {
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: PostCondition[];
  appDetails?: { name: string; icon: string };
  onFinish?: (txId: string) => void;
  onCancel?: () => void;
};

/**
 * Submit an app to the contract using Stacks Connect (for browser wallets)
 * Supports both Leather RPC API and legacy @stacks/connect
 */
export async function submitAppToContract(
  params: SubmitAppContractOptions,
  onFinish?: (txId: string) => void,
  onCancel?: () => void
): Promise<void> {
  const { ipfsHash, listingFee } = params;
  const resolvedNetwork = getPersistedNetwork();

  console.log('🔐 Initiating submit-app contract call');
  console.log('   IPFS Hash:', ipfsHash);

  const listingFeeInfo = await resolveListingFee(listingFee);
  const postConditions = buildListingFeePostConditions(listingFeeInfo.amount, listingFeeInfo.token, resolvedNetwork);
  const postConditionMode = postConditions.length > 0 ? PostConditionMode.Deny : PostConditionMode.Allow;
  console.log('🔒 Listing fee + post-condition summary:', {
    token: listingFeeInfo.token,
    amount: listingFeeInfo.amount.toString(),
    postConditionMode,
    postConditionCount: postConditions.length,
  });
  if (postConditions.length > 0) {
    console.log('   ↳ First post-condition preview:', postConditions[0]);
  }

  await executeBboxContractCall({
    functionName: 'submit-app',
    functionArgs: [stringAsciiCV(ipfsHash)],
    postConditions,
    appDetails: {
      name: 'BBOX',
      icon: typeof window !== 'undefined' ? `${window.location.origin}/bbox.png` : '',
    },
    onFinish,
    onCancel,
  });
}

/**
 * Vote on an app (upvote/downvote)
 */
export async function voteOnApp(
  appId: number,
  voteType: 'upvote' | 'downvote',
  onFinish?: (txid: string) => void,
  onCancel?: () => void
): Promise<void> {
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  const { openContractCall } = await import('@stacks/connect');
  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'vote-app',
    functionArgs: [uintCV(appId), stringAsciiCV(voteType)],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Vote submitted:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      }
    },
    onCancel: () => {
      console.log('Vote cancelled');
      if (onCancel) {
        onCancel();
      }
    },
  });
}

/**
 * Rate an app (1-5 stars)
 */
export async function rateApp(
  appId: number,
  rating: number,
  onFinish?: (txid: string) => void,
  onCancel?: () => void
): Promise<void> {
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const { openContractCall } = await import('@stacks/connect');
  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'rate-app',
    functionArgs: [uintCV(appId), uintCV(rating)],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Rating submitted:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      }
    },
    onCancel: () => {
      console.log('Rating cancelled');
      if (onCancel) {
        onCancel();
      }
    },
  });
}

export async function approveAppOnChain(
  appId: number,
  onFinish?: (txid: string) => void,
  onCancel?: () => void
): Promise<void> {
  await executeBboxContractCall({
    functionName: 'approve-app',
    functionArgs: [uintCV(appId)],
    onFinish,
    onCancel,
  });
}

type SendSbtcDonationOptions = {
  amount: bigint;
  senderAddress: string;
  recipientAddress: string;
  memo?: string;
  onFinish?: (txid: string) => void;
  onCancel?: () => void;
};

export async function sendSbtcDonation(options: SendSbtcDonationOptions): Promise<void> {
  const { amount, senderAddress, recipientAddress, memo, onFinish, onCancel } = options;

  if (!senderAddress) {
    throw new Error('Sender address required to donate sBTC');
  }
  if (!recipientAddress) {
    throw new Error('Recipient address missing');
  }
  if (amount <= 0) {
    throw new Error('Donation amount must be greater than zero');
  }

  const network = getStacksNetwork();
  const resolvedNetwork = getPersistedNetwork();
  const contractId = getSBTCContract();
  const { contractAddress, contractName } = parseContractAddress(contractId);
  const memoCV = memo && memo.length > 0 ? someCV(bufferCVFromString(memo.slice(0, 34))) : noneCV();
  const functionArgs = [
    uintCV(amount),
    standardPrincipalCV(senderAddress),
    standardPrincipalCV(recipientAddress),
    memoCV,
  ];

  const donationPostCondition: PostCondition = {
    type: 'ft-postcondition',
    address: 'origin',
    condition: 'eq',
    amount: amount.toString(),
    asset: getSbtcAssetString() as `${string}.${string}::${string}`,
  };

  if (typeof window !== 'undefined' && (window as Window & { LeatherProvider?: { request: (method: string, params: Record<string, unknown>) => Promise<{ result?: { txid?: string } }> } }).LeatherProvider) {
    try {
      const leatherProvider = (window as Window & {
        LeatherProvider: {
          request: (method: string, params: Record<string, unknown>) => Promise<{ result?: { txid?: string } }>;
        };
      }).LeatherProvider;

      const functionArgsHex = functionArgs.map((arg) => clarityValueToHex(arg));
      const postConditionsHex = [postConditionToHex(donationPostCondition)];

      const requestParams: Record<string, unknown> = {
        contract: `${contractAddress}.${contractName}`,
        functionName: 'transfer',
        functionArgs: functionArgsHex,
        anchorMode: 'any',
        network: resolvedNetwork,
        postConditionMode: 'deny',
        postConditions: postConditionsHex,
      };

      console.log('📱 Using Leather RPC for sBTC donation', {
        contract: requestParams.contract,
        network: resolvedNetwork,
        amount: amount.toString(),
        senderAddress,
        recipientAddress,
      });

      const response = await leatherProvider.request('stx_callContract', requestParams);

      if (response.result?.txid) {
        console.log('✅ Leather donation broadcast:', response.result.txid);
        if (onFinish) {
          onFinish(response.result.txid);
        }
        return;
      }

      console.warn('⚠️ Leather RPC returned without txid, falling back to Connect');
    } catch (error) {
      console.error('❌ Leather RPC donation failed, falling back to Connect:', error);
    }
  }

  const { openContractCall } = await import('@stacks/connect');
  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [donationPostCondition],
    appDetails: {
      name: 'BBOX Funding',
      icon: typeof window !== 'undefined' ? `${window.location.origin}/bbox.png` : '',
    },
    onFinish: (data) => {
      console.log('Donation submitted:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      }
    },
    onCancel: () => {
      console.log('Donation cancelled');
      if (onCancel) {
        onCancel();
      }
    },
  });
}

type SendSbtcDonationWithKeyOptions = SendSbtcDonationOptions & {
  privateKey: string;
};

export async function sendSbtcDonationWithKey(options: SendSbtcDonationWithKeyOptions): Promise<string> {
  const { privateKey, onFinish, onCancel, ...baseOptions } = options;
  const { amount, senderAddress, recipientAddress, memo } = baseOptions;

  if (!privateKey) {
    throw new Error('Missing private key for internal donation');
  }

  if (typeof window === 'undefined') {
    throw new Error('Donations with internal wallet are only available in the browser');
  }

  const network = getStacksNetwork();
  const sbtcContractId = getSBTCContract();
  const { contractAddress, contractName } = parseContractAddress(sbtcContractId);
  const memoCV = memo && memo.length > 0 ? someCV(bufferCVFromString(memo.slice(0, 34))) : noneCV();

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(recipientAddress),
      memoCV,
    ],
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
    senderKey: privateKey,
    network,
  });

  const result = await broadcastTransaction({ transaction, network });

  if (typeof result === 'object' && 'error' in result) {
    const errorResult = result as { error: string; reason?: string };
    const reason = 'reason' in errorResult && typeof errorResult.reason === 'string'
      ? errorResult.reason
      : errorResult.error;
    console.error('sBTC donation broadcast rejected:', result);
    if (onCancel) {
      onCancel();
    }
    throw new Error(reason || 'Donation broadcast failed');
  }

  const txId = typeof result === 'string'
    ? result
    : (result?.txid ?? transaction.txid())
        .toString();

  console.log('Donation broadcast via internal wallet:', txId);
  if (onFinish) {
    onFinish(txId);
  }

  return txId;
}

export async function getAdminAddress(): Promise<string | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-admin`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch admin address:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data?.result) {
      return null;
    }

    const resultValue = typeof data.result === 'string' && data.result.startsWith('0x')
      ? deserializeCV(data.result)
      : data.result;

    return cvToValue(resultValue) as string;
  } catch (error) {
    console.warn('Error fetching admin address:', error);
    return null;
  }
}

async function executeBboxContractCall(options: BboxContractCallOptions): Promise<void> {
  const {
    functionName,
    functionArgs,
    postConditions = [],
    appDetails,
    onFinish,
    onCancel,
  } = options;

  const resolvedNetwork = getPersistedNetwork();
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  console.log('🔐 Initiating contract call...');
  console.log('   Network type:', resolvedNetwork);
  console.log('   Contract:', contractId);
  console.log('   Function:', functionName);

  if (typeof window === 'undefined') {
    const error = 'Cannot call contract: window is undefined (not in browser context)';
    console.error('❌', error);
    throw new Error(error);
  }

  const hasStacksProvider = typeof (window as Window & { StacksProvider?: unknown }).StacksProvider !== 'undefined';
  const hasLeatherProvider = typeof (window as Window & { LeatherProvider?: { request: (method: string, params: unknown) => Promise<unknown> } }).LeatherProvider !== 'undefined';
  const hasXverseProviders = typeof (window as Window & { XverseProviders?: unknown }).XverseProviders !== 'undefined';
  const hasXverseStacksProvider = hasXverseProviders && typeof (window as Window & { XverseProviders?: { StacksProvider?: { request: (method: string, params: unknown) => Promise<unknown> } } }).XverseProviders?.StacksProvider !== 'undefined';

  console.log('🔍 Wallet providers:', {
    stacksProvider: hasStacksProvider,
    leatherProvider: hasLeatherProvider,
    xverseProviders: hasXverseProviders,
    xverseStacksProvider: hasXverseStacksProvider,
  });

  if (!hasStacksProvider && !hasLeatherProvider && !hasXverseProviders) {
    const error = 'No Stacks wallet extension detected. Please install Leather or Xverse wallet and refresh.';
    console.error('❌', error);
    throw new Error(error);
  }

  try {
    const checkUrl = `${getApiUrl(resolvedNetwork)}/v2/contracts/interface/${contractAddress}/${contractName}`;
    console.log('🔍 Verifying contract deployment at:', checkUrl);
    const checkResponse = await fetch(checkUrl);

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('❌ Contract verification failed:', checkResponse.status, errorText);
      throw new Error(
        `Contract not found (HTTP ${checkResponse.status}). Please deploy the bbox contract to ${contractId} before submitting apps.`
      );
    }
    console.log('✓ Contract verified on network');
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    if (error instanceof Error && error.message.includes('Contract not found')) {
      throw error;
    }
    throw new Error(
      `Contract verification failed. The bbox contract must be deployed at ${contractId} before you can submit apps.`
    );
  }

  const postConditionMode = postConditions.length > 0 ? PostConditionMode.Deny : PostConditionMode.Allow;

  if (hasLeatherProvider) {
    console.log('📱 Using Leather RPC API (preferred when available)...');
    try {
      const leatherProvider = (window as Window & {
        LeatherProvider: {
          request: (
            method: string,
            params: Record<string, unknown>
          ) => Promise<{ result?: { txid?: string; transaction?: string } }>;
        };
      }).LeatherProvider;

      const functionArgsHex = functionArgs.map((arg) => clarityValueToHex(arg));
      const postConditionsHex = postConditions.map((pc) => postConditionToHex(pc));
      const requestParams: Record<string, unknown> = {
        contract: `${contractAddress}.${contractName}`,
        functionName,
        functionArgs: functionArgsHex,
        anchorMode: 'any',
        network: resolvedNetwork,
        postConditionMode: postConditionMode === PostConditionMode.Deny ? 'deny' : 'allow',
      };
      if (postConditionsHex.length > 0) {
        requestParams.postConditions = postConditionsHex;
      }

      console.log('   Leather RPC params:', {
        ...requestParams,
        functionArgs: functionArgsHex.map((arg) => `${arg.slice(0, 12)}…`),
        postConditions: postConditionsHex.map((pc) => `${pc.slice(0, 12)}…`),
      });
      console.log('🔐 Calling Leather RPC API...');

      const response = await leatherProvider.request('stx_callContract', requestParams);

      console.log('✅ Leather RPC response:', response);

      if (response.result?.txid) {
        console.log('✅ Transaction submitted via Leather RPC!');
        console.log('   Transaction ID:', response.result.txid);
        if (onFinish) {
          onFinish(response.result.txid);
        }
        return;
      }

      console.warn('⚠️ Leather RPC returned without txid, falling back to Connect');
    } catch (leatherError) {
      console.error('❌ Leather RPC API error details:', leatherError);
      console.warn('⚠️ Leather RPC API failed, will try fallback method');
    }
  }

  if (hasXverseStacksProvider) {
    console.log('📱 Using Xverse StacksProvider RPC API...');
    try {
      const xverseProvider = (window as unknown as Window & {
        XverseProviders: {
          StacksProvider: {
            request: (
              method: string,
              params: Record<string, unknown>
            ) => Promise<{ result?: { txid?: string; transaction?: string } }>;
          };
        };
      }).XverseProviders.StacksProvider;

      const functionArgsHex = functionArgs.map((arg) => clarityValueToHex(arg));
      const postConditionsHex = postConditions.map((pc) => postConditionToHex(pc));
      const requestParams: Record<string, unknown> = {
        contract: `${contractAddress}.${contractName}`,
        functionName,
        functionArgs: functionArgsHex,
        anchorMode: 'any',
        network: resolvedNetwork,
        postConditionMode: postConditionMode === PostConditionMode.Deny ? 'deny' : 'allow',
      };
      if (postConditionsHex.length > 0) {
        requestParams.postConditions = postConditionsHex;
      }

      console.log('   Xverse RPC params:', {
        ...requestParams,
        functionArgs: functionArgsHex.map((arg) => `${arg.slice(0, 12)}…`),
        postConditions: postConditionsHex.map((pc) => `${pc.slice(0, 12)}…`),
      });
      console.log('🔐 Calling Xverse RPC API...');

      const response = await xverseProvider.request('stx_callContract', requestParams);

      console.log('✅ Xverse RPC response:', response);

      if (response.result?.txid) {
        console.log('✅ Transaction submitted via Xverse RPC!');
        console.log('   Transaction ID:', response.result.txid);
        if (onFinish) {
          onFinish(response.result.txid);
        }
        return;
      }

      console.warn('⚠️ Xverse RPC returned without txid, falling back to Connect');
    } catch (xverseError) {
      console.error('❌ Xverse RPC API error details:', xverseError);
      console.warn('⚠️ Xverse RPC API failed, will try fallback method');
    }
  }

  console.log('📱 Using @stacks/connect (fallback)...');

  const { openContractCall } = await import('@stacks/connect');

  const fallbackAppDetails = appDetails ?? {
    name: 'BBOX',
    icon: typeof window !== 'undefined' ? `${window.location.origin}/bbox.png` : '',
  };

  const contractCallOptions = {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    postConditionMode,
    postConditions,
    appDetails: fallbackAppDetails,
    onFinish: (data: { txId: string; stacksTransaction: unknown }) => {
      console.log('✅ Transaction submitted successfully!');
      console.log('   Transaction ID:', data.txId);
      console.log('   Full response:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      } else if (!data.txId) {
        console.warn('⚠️ onFinish called but no txId in response:', data);
      }
    },
    onCancel: () => {
      console.log('❌ Transaction cancelled by user');
      if (onCancel) {
        onCancel();
      }
    },
  };

  console.log('📋 Contract call options:', {
    networkType: resolvedNetwork,
    anchorMode: contractCallOptions.anchorMode,
    contractAddress: contractCallOptions.contractAddress,
    contractName: contractCallOptions.contractName,
    functionName: contractCallOptions.functionName,
    functionArgsCount: contractCallOptions.functionArgs.length,
    postConditionMode: contractCallOptions.postConditionMode,
    postConditions: contractCallOptions.postConditions?.length || 0,
    hasAppDetails: !!contractCallOptions.appDetails,
  });

  try {
    const result = openContractCall(contractCallOptions);
    console.log('✓ openContractCall returned:', result);
    console.log('   (Note: This should be undefined - callbacks handle the actual response)');

    setTimeout(() => {
      console.log('⏱️  1 second after openContractCall - wallet should be visible now');
      console.log('   If wallet is not visible, check:');
      console.log('   1. Wallet extension is installed and unlocked');
      console.log('   2. No popup blockers are active');
      console.log('   3. Browser console for wallet extension errors');
    }, 1000);
  } catch (error) {
    console.error('❌ Error calling openContractCall:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'N/A');
    throw new Error(
      `Failed to open wallet for signing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get user's vote on an app
 */
export async function getUserVote(
  voterAddress: string,
  appId: number
): Promise<Record<string, unknown> | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-vote`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [principalCV(voterAddress), uintCV(appId)],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user vote');
    }

    const data = await response.json();
    return cvToValue(data.result) as Record<string, unknown>;
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

/**
 * Get user's rating on an app
 */
export async function getUserRating(
  voterAddress: string,
  appId: number
): Promise<Record<string, unknown> | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-rating`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [principalCV(voterAddress), uintCV(appId)],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user rating');
    }

    const data = await response.json();
    return cvToValue(data.result) as Record<string, unknown>;
  } catch (error) {
    console.error('Error getting user rating:', error);
    return null;
  }
}

/**
 * Convert satoshis to BTC for display
 */
export function satsToBTC(sats: bigint): string {
  const btc = Number(sats) / 100000000;
  return btc.toFixed(8);
}

/**
 * Format listing fee for display
 */
export function formatListingFee(amount: bigint, token: string): string {
  if (token === 'sBTC') {
    return `${satsToBTC(amount)} ${token}`;
  }
  return `${amount.toString()} ${token}`;
}

/**
 * Get transaction explorer URL
 */
export function getExplorerTxUrl(txId: string, network: string): string {
  const baseUrl = 'https://explorer.hiro.so/txid';
  return `${baseUrl}/${txId}?chain=${network}`;
}

/**
 * Get contract explorer URL
 */
export function getExplorerContractUrl(network: string): string {
  const contractId = getBboxContractAddress();
  const [address, name] = contractId.split('.');
  return `https://explorer.hiro.so/address/${address}?chain=${network}#${name}`;
}

export async function resolveContractAppIdFromTx(txId: string): Promise<number | null> {
  if (!txId) {
    return null;
  }

  try {
    const networkKey = getPersistedNetwork();
    const apiUrl = getApiUrl(networkKey);
    const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);

    if (!response.ok) {
      console.warn('Failed to fetch transaction for app-id resolution', response.status);
      return null;
    }

    const data = await response.json();

    if (data.tx_status !== 'success' || !data.result) {
      console.log('Transaction not yet successful or missing result field for app-id resolution', {
        txId,
        status: data.tx_status,
      });
      return null;
    }

    const clarityResult = typeof data.result === 'string' ? deserializeCV(data.result) : data.result;
    const appId = extractAppIdFromClarityValue(clarityResult as ClarityValue);

    if (typeof appId === 'number' && Number.isFinite(appId)) {
      return appId;
    }

    console.warn('Unable to derive app-id from transaction result', { txId });
    return null;
  } catch (error) {
    console.error('Error resolving contract app-id from tx', error);
    return null;
  }
}

function extractAppIdFromClarityValue(cv: ClarityValue): number | null {
  if (!cv || typeof cv !== 'object' || !('type' in cv)) {
    return null;
  }

  if (cv.type === ClarityType.ResponseOk) {
    const okValue = (cv as ResponseOkCV<ClarityValue>).value;
    return extractAppIdFromClarityValue(okValue);
  }

  if (cv.type === ClarityType.UInt) {
    return Number((cv as UIntCV).value);
  }

  return null;
}

async function resolveListingFee(
  override?: { token: string; amount: bigint } | null
): Promise<{ token: string; amount: bigint }> {
  if (override && typeof override.amount === 'bigint') {
    console.log('💰 Using provided listing fee override:', {
      token: override.token,
      amount: override.amount.toString(),
    });
    return override;
  }
  try {
    const fee = await getListingFee();
    console.log('💰 Resolved listing fee from network:', {
      token: fee.token,
      amount: fee.amount.toString(),
    });
    return fee;
  } catch (error) {
    console.warn('⚠️ Falling back to default listing fee after fetch error:', error);
    return DEFAULT_LISTING_FEE;
  }
}

function buildListingFeePostConditions(
  amount: bigint,
  token: string,
  networkKey: Network
): PostCondition[] {
  // The bbox contract already limits how much sBTC can be transferred when submitting an app.
  // Our previous attempt at mirroring this with a wallet-side post-condition caused false
  // positives (wallet interpreted the contract address as the token owner and rolled back
  // otherwise successful transactions). Until we ship a more precise post-condition builder,
  // skip adding any extra post-conditions so the transaction can complete.
  if (amount > 0) {
    console.log('ℹ️ Skipping listing fee post-condition (contract enforces fee on-chain):', {
      amount: amount.toString(),
      token,
      networkKey,
    });
  }

  return [];
}

function clarityValueToHex(cv: ClarityValue): string {
  const serialized = serializeCV(cv);
  if (typeof serialized === 'string') {
    return serialized.startsWith('0x') ? serialized : `0x${serialized}`;
  }

  const bytes = (serialized as unknown) instanceof Uint8Array
    ? (serialized as Uint8Array)
    : Uint8Array.from(serialized as ArrayLike<number>);
  let hex = '0x';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function parseResultToClarityValue(result: unknown): ClarityValue {
  if (typeof result === 'string' && result.startsWith('0x')) {
    return deserializeCV(result);
  }

  if (result && typeof result === 'object' && 'type' in (result as Record<string, unknown>)) {
    return result as ClarityValue;
  }

  throw new Error('Unexpected contract response format');
}

function extractAppTuple(cv: ClarityValue): TupleCV | null {
  if (cv.type === ClarityType.OptionalNone) {
    return null;
  }

  if (cv.type === ClarityType.OptionalSome) {
    const someCV = cv as Extract<OptionalCV<ClarityValue>, { type: ClarityType.OptionalSome }>;
    const value = someCV.value;
    if (value && value.type === ClarityType.Tuple) {
      return value as TupleCV;
    }
  }

  return null;
}

function tupleToContractAppRecord(tuple: TupleCV, appId: number): ContractAppRecord {
  const getField = (key: string) => (tuple as unknown as { data: Record<string, ClarityValue> }).data[key];
  const getString = (key: string) => {
    const field = getField(key);
    if (!field) {
      return '';
    }
    return String(cvToValue(field));
  };
  const getBoolean = (key: string) => {
    const field = getField(key);
    if (!field) {
      return false;
    }
    return Boolean(cvToValue(field));
  };
  const getNumber = (key: string) => {
    const field = getField(key);
    if (!field) {
      return 0;
    }
    return toNumber(cvToValue(field));
  };

  return {
    appId,
    publisher: getString('publisher'),
    ipfsHash: getString('ipfs-hash'),
    status: getString('status') || 'pending',
    verified: getBoolean('verified'),
    featured: getBoolean('featured'),
    totalVotes: getNumber('total-votes'),
    positiveVotes: getNumber('positive-votes'),
    ratingSum: getNumber('rating-sum'),
    ratingCount: getNumber('rating-count'),
    createdAt: getNumber('created-at'),
    updatedAt: getNumber('updated-at'),
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return toNumber((value as { value: unknown }).value);
  }
  return 0;
}
