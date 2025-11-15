/**
 * Contract configuration for SkillChain
 */

export const CONTRACT_CONFIG = {
  // Contract address - Update this after deployment
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
  
  // RPC endpoint - Default to local node
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'ws://127.0.0.1:9944',
  
  // Chain name
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || 'Local Development',
};

/**
 * Get contract ABI
 * This should be imported from the compiled contract metadata
 */
export const getContractAbi = async () => {
  // For now, return empty object. User should import the actual ABI
  // Example: import contractAbi from '../../contracts/skillchain/target/ink/skillchain.json';
  // Or load it dynamically
  try {
    // Try to load from public folder if available
    const response = await fetch('/contracts/skillchain.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Could not load contract ABI from public folder');
  }
  
  // Return empty object as fallback - user needs to provide ABI
  return {};
};

