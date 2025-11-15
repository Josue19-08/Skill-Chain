/**
 * Wallet Context for managing Polkadot wallet connection state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

// Dynamic imports for extension-dapp to avoid SSR issues
const loadExtensionDapp = async () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return await import('@polkadot/extension-dapp');
};

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  api: ApiPromise | null;
  
  // Account state
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: InjectedAccountWithMeta) => void;
  getSigner: () => Promise<any>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
  rpcUrl?: string;
}

export function WalletProvider({ children, rpcUrl = 'ws://127.0.0.1:9944' }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);

  // Initialize API connection
  useEffect(() => {
    let apiInstance: ApiPromise | null = null;

    const initApi = async () => {
      try {
        const provider = new WsProvider(rpcUrl);
        apiInstance = await ApiPromise.create({ provider });
        setApi(apiInstance);
      } catch (error) {
        console.error('Failed to connect to Polkadot node:', error);
      }
    };

    initApi();

    return () => {
      if (apiInstance) {
        apiInstance.disconnect();
      }
    };
  }, [rpcUrl]);

  const connect = async () => {
    if (isConnecting || isConnected) return;
    
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection is only available in the browser');
    }

    setIsConnecting(true);
    try {
      // Dynamically load extension-dapp
      const extensionDapp = await loadExtensionDapp();
      if (!extensionDapp) {
        throw new Error('Extension dapp not available');
      }

      const { web3Enable, web3Accounts } = extensionDapp;

      // Enable extension
      const extensions = await web3Enable('SkillChain');
      
      if (extensions.length === 0) {
        throw new Error('No Polkadot extension found. Please install Polkadot.js extension.');
      }

      // Get accounts
      const allAccounts = await web3Accounts();
      
      if (allAccounts.length === 0) {
        throw new Error('No accounts found. Please create an account in Polkadot.js extension.');
      }

      setAccounts(allAccounts);
      
      // Auto-select first account if none selected
      if (!selectedAccount && allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0]);
      }
      
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccounts([]);
    setSelectedAccount(null);
    setIsConnected(false);
  };

  const selectAccount = (account: InjectedAccountWithMeta) => {
    setSelectedAccount(account);
  };

  const getSigner = async (): Promise<any> => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }

    // Check if we're in the browser
    if (typeof window === 'undefined') {
      throw new Error('Signer is only available in the browser');
    }

    // Dynamically load extension-dapp
    const extensionDapp = await loadExtensionDapp();
    if (!extensionDapp) {
      throw new Error('Extension dapp not available');
    }

    const { web3FromAddress } = extensionDapp;
    const injector = await web3FromAddress(selectedAccount.address);
    return injector.signer;
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isConnecting,
        api,
        accounts,
        selectedAccount,
        connect,
        disconnect,
        selectAccount,
        getSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

