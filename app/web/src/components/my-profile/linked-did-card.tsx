import React from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';

interface Props {
  onChainDid: string | null;
  isReady: boolean;
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLink?: () => void;
  canLink?: boolean;
}

export function LinkedDidCard({
  onChainDid,
  isReady,
  error,
  isRefreshing,
  onRefresh,
  onLink,
  canLink = false,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Linked DID on-chain</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={!isReady || isRefreshing}>
            {isRefreshing ? <LoadingSpinner size="sm" /> : 'Refresh'}
          </Button>
          {canLink && onLink && (
            <Button onClick={onLink} disabled={!isReady}>
              Link DID to Profile
            </Button>
          )}
        </div>
      </div>
      {error && <ErrorAlert message={error} />}
      {!error && (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">Contract status</div>
          <div className="text-sm">{isReady ? 'Contract Ready' : 'Contract Not Ready'}</div>
          <div className="text-sm text-gray-500">Linked DID</div>
          <div className="font-mono break-all text-gray-800">{onChainDid || '—'}</div>
        </div>
      )}
    </div>
  );
}


