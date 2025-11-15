/**
 * Hook for interacting with SkillChain smart contract
 */

import { useState, useEffect, useCallback } from 'react';
import { ContractPromise } from '@polkadot/api-contract';
import { useWallet } from './usePolkadot';
import { CONTRACT_CONFIG, getContractAbi } from '../config/contract';

interface UseContractReturn {
  contract: ContractPromise | null;
  isReady: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContract(): UseContractReturn {
  const { api, isConnected } = useWallet();
  const [contract, setContract] = useState<ContractPromise | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeContract = useCallback(async () => {
    if (!api || !isConnected) {
      setContract(null);
      setIsReady(false);
      return;
    }

    try {
      const abi = await getContractAbi();
      
      if (!abi || Object.keys(abi).length === 0) {
        throw new Error('Contract ABI not found. Please provide the contract ABI.');
      }

      if (!CONTRACT_CONFIG.contractAddress) {
        throw new Error('Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS.');
      }

      const contractInstance = new ContractPromise(
        api,
        abi,
        CONTRACT_CONFIG.contractAddress
      );

      setContract(contractInstance);
      setIsReady(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize contract';
      setError(errorMessage);
      setIsReady(false);
      setContract(null);
      console.error('Contract initialization error:', err);
    }
  }, [api, isConnected]);

  useEffect(() => {
    initializeContract();
  }, [initializeContract]);

  return {
    contract,
    isReady,
    error,
    refresh: initializeContract,
  };
}

