import React from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

interface Props {
  hasDid: boolean;
  isConnecting: boolean;
  isResolving: boolean;
  connectError: string | null;
  actionError: string | null;
  resolveError?: string | null;
  resolvedUri?: string | null;
  onCreateDid: () => void;
  onResolve: () => void;
}

export function ProfileSetup({
  hasDid,
  isConnecting,
  isResolving,
  connectError,
  actionError,
  resolveError,
  resolvedUri,
  onCreateDid,
  onResolve,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup</h3>

      {connectError && <ErrorAlert message={connectError} />}
      {actionError && <div className="mt-2"><ErrorAlert message={actionError} /></div>}

      <div className="flex flex-wrap gap-3">
        {!hasDid && (
          <Button onClick={onCreateDid} disabled={isConnecting}>
            {isConnecting ? <LoadingSpinner size="sm" /> : 'Create Light DID'}
          </Button>
        )}
        {hasDid && (
          <Button
            variant="outline"
            onClick={onResolve}
            disabled={isResolving || !hasDid}
            title={!hasDid ? 'Create a DID first' : undefined}
          >
            {isResolving ? <LoadingSpinner size="sm" /> : 'Resolve DID'}
          </Button>
        )}
      </div>

      {/* Feedback placed directly under the buttons */}
      {resolveError && <div className="mt-3"><ErrorAlert message={resolveError} /></div>}
      {resolvedUri && !resolveError && (
        <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          DID resolved successfully: <span className="font-mono break-all">{resolvedUri}</span>
        </div>
      )}
    </div>
  );
}


