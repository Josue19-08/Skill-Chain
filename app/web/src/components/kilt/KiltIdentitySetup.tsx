/**
 * KiltIdentitySetup - Component for setting up KILT identity
 */

import React, { useState } from 'react';
import type { KiltClient, KiltIdentity } from '@/types/kilt-types';

interface KiltIdentitySetupProps {
  kiltClient: KiltClient;
  onDidCreated?: (identity: KiltIdentity) => void;
  className?: string;
}

export const KiltIdentitySetup: React.FC<KiltIdentitySetupProps> = ({
  kiltClient,
  onDidCreated,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<KiltIdentity | null>(null);

  const handleCreateDid = async () => {
    setLoading(true);
    setError(null);

    try {
      const newIdentity = await kiltClient.createLightDid();
      setIdentity(newIdentity);
      if (onDidCreated) {
        onDidCreated(newIdentity);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create DID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-2">Create KILT Identity</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a decentralized identity (DID) using KILT Protocol. This will generate a Light DID
          that you can link to your SkillChain profile.
        </p>
      </div>

      {!identity && (
        <button
          onClick={handleCreateDid}
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating DID...' : 'Create Light DID'}
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {identity && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-semibold text-green-800 mb-2">DID Created Successfully!</h4>
          <p className="text-sm text-green-700 mb-2">
            <strong>DID:</strong> {identity.did}
          </p>
          <p className="text-xs text-green-600">
            Copy this DID and use it to link to your SkillChain profile.
          </p>
        </div>
      )}
    </div>
  );
};

