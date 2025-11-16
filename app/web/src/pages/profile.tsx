import React, { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useWallet } from '@/hooks/usePolkadot';
import { useKiltProfile } from '@/hooks/use-kilt-profile';
import { ProfileCard } from '@/components/my-profile/profile-card';
import { ProfileSetup } from '@/components/my-profile/profile-setup';
import { LinkedDidCard } from '@/components/my-profile/linked-did-card';
import { CredentialVerifier } from '@/components/my-profile/credential-verifier';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSkillchainProfile } from '@/hooks/use-skillchain-profile';

export default function ProfilePage() {
  const { isConnected: walletConnected, connect: connectWallet, selectedAccount } = useWallet();
  const { state, connect, createLightDid, resolveCurrentDid, linkDidToProfile, getDidFromAccount, verifyCredential } = useKiltProfile();
  const skillchain = useSkillchainProfile();
  const [isRefreshingLinked, setIsRefreshingLinked] = React.useState(false);
  const [linkedDid, setLinkedDid] = React.useState<string | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  useEffect(() => {
    // Auto-connect KILT network when entering the page to match test expectations
    connect();
  }, [connect]);

  return (
    <Layout title="My Profile" description="Manage your KILT identity and on-chain profile">
      <div className="container mx-auto px-4 py-10 space-y-8">
        {!walletConnected && (
          <div className="max-w-2xl mx-auto">
            <ErrorAlert message="Connect your Polkadot wallet to continue." />
            <div className="mt-4">
              <button
                className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
                onClick={connectWallet}
              >
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <ProfileCard did={state.identity.did} />

          <ProfileSetup
            hasDid={!!state.identity.did}
            isConnecting={state.isConnecting}
            isResolving={state.isResolving}
            connectError={state.connectError}
            actionError={state.actionError}
            resolveError={state.resolveError}
            resolvedUri={state.lastResolvedUri || null}
            onCreateDid={() => createLightDid()}
            onResolve={resolveCurrentDid}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <LinkedDidCard
            onChainDid={linkedDid}
            isReady={skillchain.isReady}
            error={skillchain.contractError || null}
            isRefreshing={isRefreshingLinked}
            onRefresh={async () => {
              if (!selectedAccount?.address) return;
              setIsRefreshingLinked(true);
              try {
                const did = await getDidFromAccount(selectedAccount.address, { getDid: skillchain.getDid });
                setLinkedDid(did);
              } finally {
                setIsRefreshingLinked(false);
              }
            }}
            onLink={
              state.identity.did
                ? async () => {
                    setLinkError(null);
                    try {
                      await linkDidToProfile({ linkDid: skillchain.linkDid }, selectedAccount?.address);
                      // refresh after link
                      if (selectedAccount?.address) {
                        const did = await getDidFromAccount(selectedAccount.address, { getDid: skillchain.getDid });
                        setLinkedDid(did);
                      }
                    } catch (e: any) {
                      setLinkError(e?.message || 'Failed to link DID');
                    }
                  }
                : undefined
            }
            canLink={!!state.identity.did && !!walletConnected}
          />
          {linkError && <ErrorAlert message={linkError} />}
        </div>

        <div className="max-w-5xl mx-auto">
          <CredentialVerifier
            onVerify={async (json) => {
              try {
                const parsed = JSON.parse(json);
                return await verifyCredential(parsed);
              } catch (e: any) {
                return { valid: false, revoked: false, error: e?.message || 'Invalid JSON' };
              }
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>KILT Network: {state.isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>
                Account: {selectedAccount?.address ? selectedAccount.address : '—'}
              </div>
            </div>
            {(state.isConnecting || state.isResolving) && (
              <div className="mt-4">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


