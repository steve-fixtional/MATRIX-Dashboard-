import { StorageProvider } from '../../domain/types';
import { IStorageProvider } from './storageTypes';
import { localStorageProvider } from './localStorageProvider';
import { cloudStorageProvider } from './cloudStorageProvider';
import { googleDriveStorageProvider } from './googleDriveStorageProvider';

/**
 * StorageRegistry
 * 
 * Manages storage providers and allows pluggable registration of new storage backends
 * (e.g., local, cloud, google_drive, or custom future providers) without modifying UI components.
 */
class StorageRegistry {
  private providers = new Map<string, IStorageProvider>();

  constructor() {
    this.register(localStorageProvider);
    this.register(cloudStorageProvider);
    this.register(googleDriveStorageProvider);
  }

  /**
   * Register a new storage provider or override an existing one.
   */
  register(provider: IStorageProvider): void {
    this.providers.set(provider.providerType, provider);
  }

  /**
   * Retrieve a storage provider by its type identifier.
   * Falls back to local storage provider if unknown.
   */
  get(providerType: StorageProvider | string): IStorageProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return localStorageProvider;
    }
    return provider;
  }

  /**
   * Returns list of registered provider types.
   */
  getAllProviders(): IStorageProvider[] {
    return Array.from(this.providers.values());
  }
  getRegisteredProviderTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const storageRegistry = new StorageRegistry();

export function registerStorageProvider(provider: IStorageProvider): void {
  storageRegistry.register(provider);
}

export function getStorageProvider(providerType: StorageProvider | string): IStorageProvider {
  return storageRegistry.get(providerType);
}

export function getAllStorageProviders(): IStorageProvider[] {
  return storageRegistry.getAllProviders();
}
