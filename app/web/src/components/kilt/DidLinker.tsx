/**
 * DidLinker - Component to link a KILT DID to a SkillChain profile
 */

import React, { useState } from 'react';
import type { SkillChainClient, TransactionResult } from '@/types/kilt-types';

interface DidLinkerProps {
  skillchainClient: SkillChainClient;
  signerAddress: string;
  currentDid?: string | null;
  onLinked?: (did: string) => void;
  className?: string;
}

export const DidLinker: React.FC<DidLinkerProps> = ({
  skillchainClient,
  signerAddress,
  currentDid,
  onLinked,
  className = '',
}) => {
  const [did, setDid] = useState(currentDid || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLink = async () => {
    if (!did.trim()) {
      setError('Please enter a DID');
      return;
    }

    if (!did.startsWith('did:kilt:')) {
      setError('Invalid DID format. Must start with "did:kilt:"');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result: TransactionResult = await skillchainClient.linkDid(did, signerAddress);

      if (result.success) {
        setSuccess(true);
        if (onLinked) {
          onLinked(did);
        }
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to link DID');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="did-input" className="block text-sm font-medium text-gray-700 mb-2">
          KILT DID
        </label>
        <input
          id="did-input"
          type="text"
          value={did}
          onChange={(e) => setDid(e.target.value)}
          placeholder="did:kilt:light:..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading || !!currentDid}
        />
        {currentDid && (
          <p className="mt-2 text-sm text-gray-500">Current DID: {currentDid}</p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">DID linked successfully!</p>
        </div>
      )}

      <button
        onClick={handleLink}
        disabled={loading || !!currentDid}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Linking...' : currentDid ? 'DID Already Linked' : 'Link DID'}
      </button>
    </div>
  );
};

