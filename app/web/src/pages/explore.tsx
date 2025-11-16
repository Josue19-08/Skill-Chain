/**
 * Explore page - centered with extra spacing between heading/description and search
 */

import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AddressSearch } from '@/components/explore/address-search';
import { useExploreProfileMock } from '@/hooks/use-explore-profile-mock';
import { ProfileSummary } from '@/components/explore/profile-summary';

export default function Explore() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState<string | null>(null);
  const { isLoading, error, profile } = useExploreProfileMock(searchAddress);

  useEffect(() => {
    const a = (router.query.address as string) || null;
    if (a && a !== searchAddress) setSearchAddress(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.address]);

  const handleSearch = (address: string) => {
    setSearchAddress(address);
    router.replace({ pathname: '/explore', query: { address } }, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Explore - SkillChain</title>
        <meta name="description" content="Search and explore SkillChain profiles and claims" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          {/* Vertically centered content block */}
          <div className="max-w-4xl mx-auto text-center min-h-[60vh] flex flex-col items-center justify-center gap-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
              Explore Profiles
            </h1>
            <p className="text-gray-600 mt-3">
              Search for profiles by Polkadot address and view their claims
            </p>

            {/* Search form */}
            <AddressSearch
              onSearch={handleSearch}
              loading={isLoading}
              initialAddress={searchAddress || ''}
            />

            {/* Empty state */}
            {!searchAddress && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center w-full">
                <p className="text-gray-600">
                  Enter a Polkadot address above to search for profiles and claims.
                </p>
              </div>
            )}

            {/* Search results (mock) */}
            {searchAddress && (
              <div className="w-full space-y-4">
                {isLoading && (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <p className="text-gray-600">Searching profile...</p>
                  </div>
                )}
                {!isLoading && !profile && !error && (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <p className="text-gray-600">No profile found for this address.</p>
                  </div>
                )}
                {!isLoading && error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm text-left">
                    {error}
                  </div>
                )}
                {!isLoading && profile && <ProfileSummary profile={profile} />}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}


