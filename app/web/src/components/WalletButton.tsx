/**
 * Wallet connection button component
 */

import React, { useState } from 'react';
import { useWallet } from '../hooks/usePolkadot';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';

export function WalletButton() {
  const { isConnected, isConnecting, selectedAccount, accounts, connect, disconnect, selectAccount } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowAccountMenu(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && selectedAccount) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          <span>{formatAddress(selectedAccount.address)}</span>
          <svg
            className={`h-4 w-4 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAccountMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowAccountMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-20 border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Connected Account</p>
                <p className="text-xs text-gray-500 mt-1 break-all">{selectedAccount.address}</p>
                {selectedAccount.meta.name && (
                  <p className="text-xs text-gray-600 mt-1">{selectedAccount.meta.name}</p>
                )}
              </div>
              
              {accounts.length > 1 && (
                <div className="p-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 px-2 mb-2">Switch Account</p>
                  {accounts.map((account) => (
                    <button
                      key={account.address}
                      onClick={() => {
                        selectAccount(account);
                        setShowAccountMenu(false);
                      }}
                      className={`w-full text-left px-2 py-2 rounded text-sm hover:bg-gray-100 ${
                        account.address === selectedAccount.address
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {account.meta.name || formatAddress(account.address)}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2">
                <button
                  onClick={handleDisconnect}
                  className="w-full text-left px-2 py-2 rounded text-sm text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={handleConnect}
        isLoading={isConnecting}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <div className="mt-2">
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        </div>
      )}
    </div>
  );
}

