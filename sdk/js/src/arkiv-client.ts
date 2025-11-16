/**
 * Arkiv Client - Interface for Arkiv decentralized data layer
 *
 * Arkiv provides a decentralized data layer for storing and querying off-chain data
 * with programmable expiration and SQL-like queries.
 */

import { createWalletClient, createPublicClient, http, type Hex } from '@arkiv-network/sdk';
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts';
import { mendoza } from '@arkiv-network/sdk/chains';
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils';
import { eq, gt, gte, lt, lte, neq, and, or } from '@arkiv-network/sdk/query';
import type {
  ArkivConfig,
  ArkivEntity,
  CreateArkivEntityOptions,
  UpdateArkivEntityOptions,
  ArkivQueryOptions,
  ArkivCreateResult,
} from './types';

/**
 * Arkiv client for interacting with the Arkiv decentralized data layer
 *
 * This is a wrapper around the official Arkiv SDK that provides a simplified API
 * for SkillChain integration.
 *
 * @example
 * ```typescript
 * // Read-only client (queries only)
 * const arkivClient = new ArkivClient();
 * const results = await arkivClient.query({
 *   filters: [{ key: 'type', value: 'profile' }]
 * });
 *
 * // Client with write access
 * const arkivClient = new ArkivClient({
 *   privateKey: '0x...'
 * });
 * const result = await arkivClient.createEntity({
 *   payload: { name: 'John Doe', skills: ['Rust', 'Polkadot'] },
 *   attributes: [{ key: 'type', value: 'profile' }],
 *   expiresInMinutes: 60
 * });
 * ```
 */
export class ArkivClient {
  private walletClient?: any;
  private publicClient: any;
  private rpcUrl: string;
  private wsUrl: string;

  /**
   * Create a new Arkiv client instance
   * @param config - Configuration options
   */
  constructor(config?: ArkivConfig) {
    // Default to Mendoza testnet
    this.rpcUrl = config?.rpcUrl || 'https://mendoza.hoodi.arkiv.network/rpc';
    this.wsUrl = config?.wsUrl || 'wss://mendoza.hoodi.arkiv.network/rpc/ws';

    // Create public client for read operations
    this.publicClient = createPublicClient({
      chain: mendoza,
      transport: http(this.rpcUrl),
    });

    // Create wallet client if private key is provided (for write operations)
    if (config?.privateKey) {
      this.walletClient = createWalletClient({
        chain: mendoza,
        transport: http(this.rpcUrl),
        account: privateKeyToAccount(config.privateKey as Hex),
      });
    }
  }

  /**
   * Create a new entity in Arkiv
   * Requires wallet client (private key must be provided in config)
   *
   * @param options - Entity creation options
   * @returns Result with entity key and transaction hash
   *
   * @example
   * ```typescript
   * const result = await arkivClient.createEntity({
   *   payload: {
   *     profileId: 'user123',
   *     name: 'John Doe',
   *     bio: 'Blockchain developer',
   *   },
   *   attributes: [
   *     { key: 'type', value: 'profile' },
   *     { key: 'userId', value: 'user123' }
   *   ],
   *   expiresInMinutes: 1440 // 24 hours
   * });
   * ```
   */
  async createEntity(
    options: CreateArkivEntityOptions
  ): Promise<ArkivCreateResult> {
    if (!this.walletClient) {
      return {
        success: false,
        error: 'Wallet client not initialized. Provide a private key in config for write operations.',
      };
    }

    try {
      const payload = jsonToPayload(options.payload);
      const contentType = options.contentType || 'application/json';
      const attributes = options.attributes || [];

      // Set expiration time
      let expiresIn;
      if (options.expiresInMinutes) {
        expiresIn = ExpirationTime.fromMinutes(options.expiresInMinutes);
      }

      const createParams: any = {
        payload,
        contentType,
        attributes: attributes.map(attr => ({
          key: attr.key,
          value: attr.value,
        })),
      };

      if (expiresIn !== undefined) {
        createParams.expiresIn = expiresIn;
      }

      const { entityKey, txHash } = await this.walletClient.createEntity(createParams);

      return {
        success: true,
        entityKey,
        txHash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error creating entity',
      };
    }
  }

  /**
   * Update an existing entity in Arkiv
   * Requires wallet client (private key must be provided in config)
   *
   * @param options - Update options
   * @returns Result with transaction hash
   *
   * @example
   * ```typescript
   * const result = await arkivClient.updateEntity({
   *   entityKey: '0x...',
   *   payload: { name: 'Jane Doe', skills: ['Rust', 'Polkadot', 'Ink!'] },
   *   attributes: [{ key: 'updated', value: 'true' }]
   * });
   * ```
   */
  async updateEntity(
    options: UpdateArkivEntityOptions
  ): Promise<ArkivCreateResult> {
    if (!this.walletClient) {
      return {
        success: false,
        error: 'Wallet client not initialized. Provide a private key in config for write operations.',
      };
    }

    try {
      const payload = jsonToPayload(options.payload);
      const attributes = options.attributes || [];

      // Set expiration time
      let expiresIn;
      if (options.expiresInMinutes) {
        expiresIn = ExpirationTime.fromMinutes(options.expiresInMinutes);
      }

      const updateParams: any = {
        entityKey: options.entityKey as Hex,
        payload,
        attributes: attributes.map(attr => ({
          key: attr.key,
          value: attr.value,
        })),
      };

      if (expiresIn !== undefined) {
        updateParams.expiresIn = expiresIn;
      }

      const { txHash } = await this.walletClient.updateEntity(updateParams);

      return {
        success: true,
        entityKey: options.entityKey,
        txHash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error updating entity',
      };
    }
  }

  /**
   * Delete an entity from Arkiv
   * Requires wallet client (private key must be provided in config)
   *
   * @param entityKey - Key of the entity to delete
   * @returns Result with transaction hash
   *
   * @example
   * ```typescript
   * const result = await arkivClient.deleteEntity('0x...');
   * ```
   */
  async deleteEntity(entityKey: string): Promise<ArkivCreateResult> {
    if (!this.walletClient) {
      return {
        success: false,
        error: 'Wallet client not initialized. Provide a private key in config for write operations.',
      };
    }

    try {
      const { txHash } = await this.walletClient.deleteEntity({
        entityKey: entityKey as Hex
      });

      return {
        success: true,
        entityKey,
        txHash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error deleting entity',
      };
    }
  }

  /**
   * Query entities from Arkiv using filters
   *
   * @param options - Query options with filters
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * // Query all profile entities
   * const profiles = await arkivClient.query({
   *   filters: [{ key: 'type', value: 'profile' }],
   *   withPayload: true,
   *   withAttributes: true
   * });
   *
   * // Query with multiple filters
   * const results = await arkivClient.query({
   *   filters: [
   *     { key: 'type', value: 'claim' },
   *     { key: 'status', value: 'approved' }
   *   ],
   *   limit: 10
   * });
   * ```
   */
  async query(options?: ArkivQueryOptions): Promise<ArkivEntity[]> {
    try {
      let queryBuilder = this.publicClient.buildQuery();

      // Apply filters
      if (options?.filters && options.filters.length > 0) {
        // Convert filters to predicates
        const predicates = options.filters.map(filter => {
          const operator = filter.operator || 'eq';
          const value = filter.value;

          switch (operator) {
            case 'eq':
              return eq(filter.key, value);
            case 'ne':
            case 'neq':
              return neq(filter.key, value);
            case 'gt':
              return gt(filter.key, value);
            case 'gte':
              return gte(filter.key, value);
            case 'lt':
              return lt(filter.key, value);
            case 'lte':
              return lte(filter.key, value);
            default:
              return eq(filter.key, value);
          }
        });

        // If multiple predicates, combine with AND
        if (predicates.length === 1) {
          queryBuilder = queryBuilder.where(predicates[0]);
        } else {
          queryBuilder = queryBuilder.where(and.apply(null, [predicates]));
        }
      }

      // Include attributes and payload if requested
      if (options?.withAttributes) {
        queryBuilder = queryBuilder.withAttributes(true);
      }

      if (options?.withPayload) {
        queryBuilder = queryBuilder.withPayload(true);
      }

      // Apply limit if specified
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      // Execute query
      const result = await queryBuilder.fetch();

      // Map results to ArkivEntity interface
      return (result.entities || []).map((entity: any) => ({
        entityKey: entity.key || entity.entityKey,
        payload: entity.payload ? this.parsePayload(entity.payload) : undefined,
        contentType: entity.contentType || 'application/json',
        attributes: entity.attributes || [],
        expiresAt: entity.expiresAt,
        createdAt: entity.createdAt || Date.now(),
      }));
    } catch (error: any) {
      console.error('Error querying Arkiv:', error);
      return [];
    }
  }

  /**
   * Get a single entity by its key
   *
   * @param entityKey - Key of the entity to retrieve
   * @returns Entity or null if not found
   *
   * @example
   * ```typescript
   * const entity = await arkivClient.getEntity('0x...');
   * if (entity) {
   *   console.log('Entity payload:', entity.payload);
   * }
   * ```
   */
  async getEntity(entityKey: string): Promise<ArkivEntity | null> {
    try {
      const entity = await this.publicClient.getEntity(entityKey as Hex);

      if (!entity) {
        return null;
      }

      return {
        entityKey: entity.key || entityKey,
        payload: entity.payload ? this.parsePayload(entity.payload) : undefined,
        contentType: entity.contentType || 'application/json',
        attributes: entity.attributes || [],
        expiresAt: entity.expiresAt,
        createdAt: entity.createdAt || Date.now(),
      };
    } catch (error: any) {
      console.error('Error getting entity:', error);
      return null;
    }
  }

  /**
   * Parse payload from Uint8Array to object
   * @private
   */
  private parsePayload(payload: Uint8Array | string): any {
    try {
      if (typeof payload === 'string') {
        return JSON.parse(payload);
      }
      // Convert Uint8Array to string and parse JSON
      const text = new TextDecoder().decode(payload);
      return JSON.parse(text);
    } catch (error) {
      // If not JSON, return as is
      return payload;
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    // Cleanup if needed
  }
}
