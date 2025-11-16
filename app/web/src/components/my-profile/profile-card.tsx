import React from 'react';

interface Props {
  did: string | null;
}

export function ProfileCard({ did }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">My KILT Identity</h2>
      {did ? (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">DID</div>
          <div className="font-mono break-all text-gray-800">{did}</div>
        </div>
      ) : (
        <div className="text-gray-600">You do not have a DID yet.</div>
      )}
    </div>
  );
}



