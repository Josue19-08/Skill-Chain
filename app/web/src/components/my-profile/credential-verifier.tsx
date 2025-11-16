import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

interface Props {
  onVerify: (credentialJson: string) => Promise<{ valid: boolean; revoked: boolean; attester?: string; error?: string }>;
}

export function CredentialVerifier({ onVerify }: Props) {
  const [input, setInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; revoked: boolean; attester?: string; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setResult(null);
    try {
      const res = await onVerify(input);
      setResult(res);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify Credential</h3>
      <textarea
        className="w-full h-40 p-3 border rounded font-mono text-sm"
        placeholder='Paste credential JSON here'
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="mt-3">
        <Button onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? <LoadingSpinner size="sm" /> : 'Verify'}
        </Button>
      </div>
      {error && <div className="mt-3"><ErrorAlert message={error} /></div>}
      {result && !error && (
        <div className="mt-3 text-sm">
          <div className={`mb-1 ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
            Valid: {String(result.valid)}
          </div>
          <div className="mb-1">Revoked: {String(result.revoked)}</div>
          {result.attester && <div className="mb-1">Attester: {result.attester}</div>}
        </div>
      )}
    </div>
  );
}


