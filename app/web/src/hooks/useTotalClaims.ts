/**
 * Hook to get total number of claims
 */

import { useState, useEffect } from 'react';
import { useContract } from './useContract';
import { useWallet } from './usePolkadot';

export function useTotalClaims() {
  const { contract, isReady } = useContract();
  const { selectedAccount } = useWallet();
  const [totalClaims, setTotalClaims] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotalClaims = async () => {
    if (!contract || !isReady) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call get_total_claims query (no account needed for this query)
      // Use any account address or null for queries that don't need a signer
      const caller = selectedAccount?.address || null;
      const result = await contract.query.getTotalClaims(
        caller,
        { value: 0, gasLimit: -1 }
      );

      if (result.result.isOk) {
        const output = result.output?.toHuman() as any;
        // Parse the result - it should be a number or string representation
        let total = 0;
        if (typeof output === 'number') {
          total = output;
        } else if (typeof output === 'string') {
          total = parseInt(output.replace(/,/g, ''), 10) || 0;
        } else if (output && typeof output === 'object') {
          // Sometimes the output is wrapped in an object
          total = parseInt(String(Object.values(output)[0] || 0), 10);
        }
        setTotalClaims(total);
      } else {
        const error = result.result.asErr;
        throw new Error(`Query failed: ${error.toString()}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch total claims';
      setError(errorMessage);
      console.error('Error fetching total claims:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      fetchTotalClaims();
    }
  }, [contract, isReady]);

  return {
    totalClaims,
    isLoading,
    error,
    refetch: fetchTotalClaims,
  };
}

