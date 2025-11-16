/**
 * Simple connection test for KILT Protocol
 * 
 * This test verifies that we can connect to KILT network and perform basic operations.
 * Run with: npm test -- kilt-connection.test.ts
 * 
 * Set KILT_NETWORK environment variable to test different networks:
 *   KILT_NETWORK=wss://peregrine.kilt.io npm test
 */

import { KiltClient } from './kilt-client';
import * as Kilt from '@kiltprotocol/sdk-js';

describe('KILT Connection Test', () => {
  const testNetwork = process.env.KILT_NETWORK || 'wss://peregrine.kilt.io';

  afterAll(async () => {
    // Force disconnect from KILT to prevent Jest from hanging
    try {
      await Kilt.disconnect();
    } catch {
      // Ignore errors
    }
    // Give time for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should connect to KILT testnet and create a Light DID', async () => {
    const kiltClient = new KiltClient({
      network: testNetwork,
    });

    try {
      // Test connection
      console.log(`\n🔌 Connecting to KILT network: ${testNetwork}`);
      await kiltClient.connect();
      console.log('✅ Connected to KILT network successfully!');

      // Test Light DID creation
      console.log('\n🆔 Creating Light DID...');
      const identity = await kiltClient.createLightDid();
      console.log('✅ Light DID created:', identity.did);
      console.log('   Type:', identity.lightDid ? 'Light DID' : 'Full DID');

      // Verify DID format
      expect(identity.did).toBeDefined();
      expect(identity.did).toMatch(/^did:kilt:light:/);
      expect(identity.lightDid).toBe(true);

      // Test DID resolution
      console.log('\n🔍 Resolving DID...');
      const didDocument = await kiltClient.resolveDid(identity.did);
      if (didDocument) {
        console.log('✅ DID resolved successfully');
        console.log('   URI:', didDocument.uri);
      } else {
        console.log('⚠️  DID resolution returned null (may be expected for Light DIDs)');
      }

      // Disconnect
      await kiltClient.disconnect();
      console.log('\n✅ Disconnected from KILT network');
      console.log('\n🎉 All connection tests passed!');

    } catch (error: any) {
      console.error('\n❌ Connection test failed:', error.message);
      try {
        await kiltClient.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      throw error;
    }
  }, 60000); // 60 second timeout

  it('should handle connection errors gracefully', async () => {
    const kiltClient = new KiltClient({
      network: 'wss://invalid-kilt-network.io:9944',
    });

    try {
      // The connect() method now has its own timeout, so it should reject
      await expect(kiltClient.connect()).rejects.toThrow();
    } finally {
      // Ensure cleanup even if test fails
      try {
        await kiltClient.disconnect();
      } catch {
        // Ignore
      }
    }
  }, 20000);
});

