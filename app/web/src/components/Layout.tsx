/**
 * Main layout component
 */

import React from 'react';
import Head from 'next/head';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function Layout({ children, title = 'SkillChain', description }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title} - SkillChain</title>
        {description && <meta name="description" content={description} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <main>{children}</main>
      </div>
    </>
  );
}

