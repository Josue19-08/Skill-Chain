/**
 * CredentialVerifier - Component to verify KILT credentials
 */

import React, { useState } from 'react';
import type { KiltClient, KiltCredential } from '@skillchain/sdk';

interface CredentialVerifierProps {
  kiltClient: KiltClient;
  className?: string;
}

export const CredentialVerifier: React.FC<CredentialVerifierProps> = ({
  kiltClient,
  className = '',
}) => {
  const [credentialJson, setCredentialJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    revoked: boolean;
    attester?: string;
    error?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!credentialJson.trim()) {
      setResult({ valid: false, revoked: false, error: 'Please enter credential JSON' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const credential = JSON.parse(credentialJson);
      const verificationResult = await kiltClient.verifyCredential(credential);
      setResult(verificationResult);
    } catch (err: any) {
      setResult({
        valid: false,
        revoked: false,
        error: err.message || 'Invalid credential format',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-2">Verify KILT Credential</h3>
        <p className="text-sm text-gray-600 mb-4">
          Paste a KILT credential JSON to verify its validity and check if it has been revoked.
        </p>
      </div>

      <div>
        <label htmlFor="credential-input" className="block text-sm font-medium text-gray-700 mb-2">
          Credential JSON
        </label>
        <textarea
          id="credential-input"
          value={credentialJson}
          onChange={(e) => setCredentialJson(e.target.value)}
          placeholder='{"@context": [...], "credentialSubject": {...}, ...}'
          rows={8}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Verify Credential'}
      </button>

      {result && (
        <div
          className={`p-4 border rounded-md ${
            result.valid && !result.revoked
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {result.valid && !result.revoked ? (
            <div>
              <h4 className="font-semibold text-green-800 mb-2">✓ Credential is Valid</h4>
              {result.attester && (
                <p className="text-sm text-green-700">
                  <strong>Attester:</strong> {result.attester}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h4 className="font-semibold text-red-800 mb-2">
                ✗ Credential is {result.revoked ? 'Revoked' : 'Invalid'}
              </h4>
              {result.error && (
                <p className="text-sm text-red-700">{result.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

