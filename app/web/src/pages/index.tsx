import { Layout } from '@/components/Layout';
import { useWallet } from '@/hooks/usePolkadot';
import { useContract } from '@/hooks/useContract';
import { useTotalClaims } from '@/hooks/useTotalClaims';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';

export default function Home() {
  const { isConnected, selectedAccount } = useWallet();
  const { isReady, error: contractError } = useContract();
  const { totalClaims, isLoading: isLoadingClaims, error: claimsError } = useTotalClaims();

  return (
    <Layout
      title="Home"
      description="Decentralized professional reputation protocol built on Polkadot"
    >
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Skill<span className="text-primary-600">Chain</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            On-Chain Professional Reputation Protocol
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Build your verifiable professional reputation on Polkadot.
            Register achievements, receive endorsements, and showcase your
            validated skills to the world.
          </p>
        </div>

        {/* Stats Section */}
        {isConnected && isReady && (
          <div className="mb-16">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Statistics</h2>
              
              {isLoadingClaims ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : claimsError ? (
                <ErrorAlert message={claimsError} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary-600 mb-2">
                      {totalClaims !== null ? totalClaims : '0'}
                    </div>
                    <div className="text-gray-600">Total Claims</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary-600 mb-2">
                      {isConnected ? '✓' : '—'}
                    </div>
                    <div className="text-gray-600">Wallet Connected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary-600 mb-2">
                      {isReady ? '✓' : '—'}
                    </div>
                    <div className="text-gray-600">Contract Ready</div>
                  </div>
                </div>
              )}

              {contractError && (
                <div className="mt-4">
                  <ErrorAlert message={`Contract Error: ${contractError}`} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-3">Decentralized</h3>
            <p className="text-gray-600">
              Your reputation lives on-chain, owned by you, verified by the
              network.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-3">Verifiable</h3>
            <p className="text-gray-600">
              All claims are cryptographically signed and publicly auditable.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-3">Portable</h3>
            <p className="text-gray-600">
              Take your reputation anywhere in the Web3 ecosystem.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Connect your wallet to start building your on-chain reputation
              </p>
              <p className="text-sm text-gray-500">
                Make sure you have the Polkadot.js extension installed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Welcome, {selectedAccount?.meta.name || 'User'}!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/profile">
                  <Button size="lg">View My Profile</Button>
                </Link>
                <Link href="/explore">
                  <Button variant="outline" size="lg">Explore Profiles</Button>
                </Link>
                <Link href="/claims/new">
                  <Button variant="secondary" size="lg">Create Claim</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

