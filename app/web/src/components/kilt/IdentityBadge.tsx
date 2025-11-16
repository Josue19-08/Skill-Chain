/**
 * IdentityBadge - Component to display KILT identity verification badge
 */

import React from 'react';

interface IdentityBadgeProps {
  did?: string | null;
  verified?: boolean;
  className?: string;
}

export const IdentityBadge: React.FC<IdentityBadgeProps> = ({
  did,
  verified = false,
  className = '',
}) => {
  if (!did && !verified) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span>Identity Verified</span>
      {did && (
        <span className="text-xs opacity-75" title={did}>
          {did.substring(0, 20)}...
        </span>
      )}
    </div>
  );
};

