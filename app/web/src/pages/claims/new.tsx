/**
 * Create Claim page - orchestrates the ClaimForm
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { ClaimForm } from '@/components/claims/claim-form';
import { useAddClaim } from '@/hooks/use-add-claim';

export default function NewClaimPage() {
  const router = useRouter();
  const { submit, isSubmitting, error, txHash } = useAddClaim();

  const handleSubmit = async (data: { receiver: string; claimType: any; proofHash: string }) => {
    try {
      await submit(data.receiver, data.claimType, data.proofHash);
      router.replace('/claims/pending');
    } catch {
      // swallow; error is already handled by hook state
    }
  };

  return (
    <>
      <Head>
        <title>Create Claim - SkillChain</title>
        <meta name="description" content="Create a new claim on SkillChain" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Create Claim</h1>
              <p className="text-gray-600 mt-2">Fill in the details to create a new claim.</p>
            </div>

            <ClaimForm onSubmit={handleSubmit} submitting={isSubmitting} error={error} />

            {txHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
                Transaction included: <span className="font-mono">{txHash}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}


