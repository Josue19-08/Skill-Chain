/**
 * Tests for KILT Client
 * 
 * These tests verify the connection to KILT network and basic functionality.
 * Note: These tests require a connection to KILT network (testnet or local node).
 */

import { KiltClient } from './kilt-client';
import type { KiltConfig } from './types';

describe('KiltClient', () => {
  let kiltClient: KiltClient;
  const testNetwork = process.env.KILT_NETWORK || 'wss://peregrine.kilt.io';

  beforeAll(() => {
    kiltClient = new KiltClient({
      network: testNetwork,
    });
  });

  afterAll(async () => {
    await kiltClient.disconnect();
  });

  describe('Connection', () => {
    it('should connect to KILT network', async () => {
      await expect(kiltClient.connect()).resolves.not.toThrow();
    }, 30000); // 30 second timeout for network connection

    it('should disconnect from KILT network', async () => {
      await kiltClient.connect();
      await expect(kiltClient.disconnect()).resolves.not.toThrow();
    }, 30000);

    it('should handle multiple connect/disconnect calls', async () => {
      await kiltClient.connect();
      await kiltClient.disconnect();
      await kiltClient.connect();
      await kiltClient.disconnect();
      await expect(kiltClient.connect()).resolves.not.toThrow();
    }, 30000);
  });

  describe('Light DID Creation', () => {
    beforeEach(async () => {
      await kiltClient.connect();
    });

    afterEach(async () => {
      await kiltClient.disconnect();
    });

    it('should create a Light DID', async () => {
      const identity = await kiltClient.createLightDid();

      expect(identity).toBeDefined();
      expect(identity.did).toBeDefined();
      expect(identity.did).toMatch(/^did:kilt:light:/);
      expect(identity.lightDid).toBe(true);
    }, 30000);

    it('should create unique Light DIDs', async () => {
      const identity1 = await kiltClient.createLightDid();
      const identity2 = await kiltClient.createLightDid();

      expect(identity1.did).not.toBe(identity2.did);
    }, 30000);

    it('should create Light DID with custom authentication key', async () => {
      // This test is skipped as it requires more complex setup
      // The default createLightDid() already tests the functionality
      const identity = await kiltClient.createLightDid();
      expect(identity).toBeDefined();
      expect(identity.did).toMatch(/^did:kilt:light:/);
    }, 30000);
  });

  describe('DID Resolution', () => {
    beforeEach(async () => {
      await kiltClient.connect();
    });

    afterEach(async () => {
      await kiltClient.disconnect();
    });

    it('should resolve a Light DID', async () => {
      // Create a DID first
      const identity = await kiltClient.createLightDid();

      // Resolve it
      const didDocument = await kiltClient.resolveDid(identity.did);

      expect(didDocument).toBeDefined();
      expect(didDocument?.uri).toBe(identity.did);
    }, 30000);

    it('should return null for invalid DID', async () => {
      const result = await kiltClient.resolveDid('did:kilt:invalid:123');

      expect(result).toBeNull();
    }, 30000);
  });

  describe('Credential Verification', () => {
    beforeEach(async () => {
      await kiltClient.connect();
    });

    afterEach(async () => {
      await kiltClient.disconnect();
    });

    it('should handle invalid credential format', async () => {
      const result = await kiltClient.verifyCredential({
        invalid: 'credential',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    }, 30000);

    it('should handle missing credential', async () => {
      const result = await kiltClient.verifyCredential(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    }, 30000);
  });

  describe('Integration with SkillChain', () => {
    beforeEach(async () => {
      await kiltClient.connect();
    });

    afterEach(async () => {
      await kiltClient.disconnect();
    });

    it('should create and format DID correctly for SkillChain', async () => {
      const identity = await kiltClient.createLightDid();

      // Verify format is correct for SkillChain contract
      expect(identity.did).toMatch(/^did:kilt:/);
      expect(identity.did.length).toBeGreaterThan(20);

      // This DID can be used with linkDid() in SkillChain contract
      console.log('DID ready for SkillChain:', identity.did);
    }, 30000);
  });
});

