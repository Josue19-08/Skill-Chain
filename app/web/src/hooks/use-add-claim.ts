/**
 * Hook to submit a new claim on-chain via the SkillChain contract.
 * - Signs and sends addClaim(receiver, claimType, proofHash)
 * - Returns tx hash on inclusion/finalization
 */

import { useCallback, useState } from 'react';
import type { ClaimType } from '@/types/claim-types';
import { useContract } from '@/hooks/useContract';
import { useWallet } from '@/hooks/usePolkadot';

export function useAddClaim() {
  const { contract, isReady } = useContract();
  const { selectedAccount, getSigner } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const submit = useCallback(
    async (receiver: string, claimType: ClaimType | string, proofHash: string) => {
      // Precondition checks: surface friendly errors instead of throwing
      if (!contract || !isReady) {
        setError('Contract not ready. Connect wallet and ensure RPC/contract are configured.');
        return;
      }
      if (!selectedAccount) {
        setError('No wallet account selected. Please connect your wallet.');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setTxHash(null);
      try {
        const signer = await getSigner();

        // Pre-query to estimate gas
        const queryRes = await contract.query.addClaim(
          selectedAccount.address,
          { value: 0, gasLimit: -1 },
          receiver,
          String(claimType),
          proofHash
        );
        const gasLimit = (queryRes as any)?.gasRequired ?? -1;

        // Sign and send tx
        const unsub = await contract.tx
          .addClaim({ value: 0, gasLimit }, receiver, String(claimType), proofHash)
          .signAndSend(selectedAccount.address, { signer }, (result) => {
            if (result.status.isInBlock) {
              setTxHash(result.status.asInBlock.toString());
            }
            if (result.status.isFinalized) {
              setIsSubmitting(false);
              unsub();
            }
            if ((result as any).dispatchError) {
              // Best-effort error surface; final error path uses catch below as well
              setError((result as any).dispatchError.toString());
            }
          });
      } catch (e: any) {
        setIsSubmitting(false);
        setError(e?.message || 'Failed to submit claim');
        // Do not rethrow; UI will read error state
      }
    },
    [contract, isReady, selectedAccount, getSigner]
  );

  return { submit, isSubmitting, error, txHash };
}


