/**
 * Tests for Arkiv Client
 */

import { ArkivClient } from './arkiv-client';
import type { CreateArkivEntityOptions, ArkivQueryOptions } from './types';

// Mock the Arkiv SDK
jest.mock('@arkiv-network/sdk', () => ({
  createWalletClient: jest.fn(() => ({
    createEntity: jest.fn(async () => ({
      entityKey: '0x1234567890abcdef',
      txHash: '0xabcdef1234567890',
    })),
    updateEntity: jest.fn(async () => ({
      txHash: '0xabcdef1234567890',
    })),
    deleteEntity: jest.fn(async () => ({
      txHash: '0xabcdef1234567890',
    })),
  })),
  createPublicClient: jest.fn(() => ({
    buildQuery: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      withAttributes: jest.fn().mockReturnThis(),
      withPayload: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      fetch: jest.fn(async () => ({
        entities: [
          {
            key: '0x1234567890abcdef',
            entityKey: '0x1234567890abcdef',
            payload: new TextEncoder().encode(JSON.stringify({ name: 'Test User', skills: ['Rust'] })),
            contentType: 'application/json',
            attributes: [{ key: 'type', value: 'profile' }],
            createdAt: Date.now(),
          },
        ],
        hasNextPage: jest.fn(() => false),
        next: jest.fn(),
      })),
      subscribe: jest.fn(async (callback: any) => {
        // Simulate a subscription callback
        setTimeout(() => {
          callback({
            entityKey: '0x1234567890abcdef',
            payload: { name: 'New Entity' },
            contentType: 'application/json',
            attributes: [],
            createdAt: Date.now(),
          });
        }, 100);
        return jest.fn(); // Return unsubscribe function
      }),
    })),
    getEntity: jest.fn(async () => ({
      key: '0x1234567890abcdef',
      entityKey: '0x1234567890abcdef',
      payload: new TextEncoder().encode(JSON.stringify({ name: 'Test User' })),
      contentType: 'application/json',
      attributes: [{ key: 'type', value: 'profile' }],
      createdAt: Date.now(),
    })),
  })),
  http: jest.fn(),
}));

jest.mock('@arkiv-network/sdk/accounts', () => ({
  privateKeyToAccount: jest.fn(() => ({
    address: '0xTestAddress',
  })),
}));

jest.mock('@arkiv-network/sdk/chains', () => ({
  mendoza: {
    id: 60138453056,
    name: 'Mendoza',
    rpcUrls: {
      default: { http: ['https://mendoza.hoodi.arkiv.network/rpc'] },
    },
  },
}));

jest.mock('@arkiv-network/sdk/utils', () => ({
  ExpirationTime: {
    fromMinutes: jest.fn((minutes: number) => minutes * 60 * 1000),
  },
  jsonToPayload: jest.fn((data: any) => JSON.stringify(data)),
}));

jest.mock('@arkiv-network/sdk/query', () => ({
  eq: jest.fn((key: string, value: string) => ({ key, value, operator: 'eq' })),
}));

describe('ArkivClient', () => {
  describe('Initialization', () => {
    it('should create a read-only client without private key', () => {
      const client = new ArkivClient();
      expect(client).toBeDefined();
    });

    it('should create a client with write access when private key is provided', () => {
      const client = new ArkivClient({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });
      expect(client).toBeDefined();
    });

    it('should use custom RPC and WebSocket URLs when provided', () => {
      const client = new ArkivClient({
        rpcUrl: 'https://custom.rpc.url',
        wsUrl: 'wss://custom.ws.url',
      });
      expect(client).toBeDefined();
    });
  });

  describe('createEntity', () => {
    it('should return error if wallet client is not initialized', async () => {
      const client = new ArkivClient();
      const result = await client.createEntity({
        payload: { name: 'Test' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet client not initialized');
    });

    it('should create an entity successfully with wallet client', async () => {
      const client = new ArkivClient({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });

      const options: CreateArkivEntityOptions = {
        payload: {
          name: 'John Doe',
          skills: ['Rust', 'Polkadot'],
        },
        attributes: [
          { key: 'type', value: 'profile' },
          { key: 'userId', value: 'user123' },
        ],
        expiresInMinutes: 60,
      };

      const result = await client.createEntity(options);

      expect(result.success).toBe(true);
      expect(result.entityKey).toBe('0x1234567890abcdef');
      expect(result.txHash).toBe('0xabcdef1234567890');
    });

    it('should use default content type if not provided', async () => {
      const client = new ArkivClient({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });

      const result = await client.createEntity({
        payload: { test: 'data' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateEntity', () => {
    it('should return error if wallet client is not initialized', async () => {
      const client = new ArkivClient();
      const result = await client.updateEntity({
        entityKey: '0x1234567890abcdef',
        payload: { name: 'Updated' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet client not initialized');
    });

    it('should update an entity successfully', async () => {
      const client = new ArkivClient({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });

      const result = await client.updateEntity({
        entityKey: '0x1234567890abcdef',
        payload: { name: 'Jane Doe', skills: ['Rust', 'Polkadot', 'Ink!'] },
        attributes: [{ key: 'updated', value: 'true' }],
      });

      expect(result.success).toBe(true);
      expect(result.entityKey).toBe('0x1234567890abcdef');
      expect(result.txHash).toBe('0xabcdef1234567890');
    });
  });

  describe('deleteEntity', () => {
    it('should return error if wallet client is not initialized', async () => {
      const client = new ArkivClient();
      const result = await client.deleteEntity('0x1234567890abcdef');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet client not initialized');
    });

    it('should delete an entity successfully', async () => {
      const client = new ArkivClient({
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      });

      const result = await client.deleteEntity('0x1234567890abcdef');

      expect(result.success).toBe(true);
      expect(result.entityKey).toBe('0x1234567890abcdef');
      expect(result.txHash).toBe('0xabcdef1234567890');
    });
  });

  describe('query', () => {
    it('should query entities without filters', async () => {
      const client = new ArkivClient();
      const results = await client.query();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should query entities with filters', async () => {
      const client = new ArkivClient();
      const options: ArkivQueryOptions = {
        filters: [{ key: 'type', value: 'profile' }],
        withPayload: true,
        withAttributes: true,
      };

      const results = await client.query(options);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityKey).toBeDefined();
      expect(results[0].payload).toBeDefined();
    });

    it('should query entities with limit', async () => {
      const client = new ArkivClient();
      const options: ArkivQueryOptions = {
        filters: [{ key: 'type', value: 'profile' }],
        limit: 5,
      };

      const results = await client.query(options);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should query entities with multiple filters', async () => {
      const client = new ArkivClient();
      const options: ArkivQueryOptions = {
        filters: [
          { key: 'type', value: 'claim' },
          { key: 'status', value: 'approved' },
        ],
      };

      const results = await client.query(options);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getEntity', () => {
    it('should get a single entity by key', async () => {
      const client = new ArkivClient();
      const entity = await client.getEntity('0x1234567890abcdef');

      expect(entity).toBeDefined();
      expect(entity?.entityKey).toBe('0x1234567890abcdef');
      expect(entity?.payload).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      const client = new ArkivClient();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});
