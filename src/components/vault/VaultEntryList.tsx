/**
 * MATRIX Password Vault - Entry List Component
 * 
 * Renders the decrypted list of credentials when the vault is unlocked.
 * Includes search bar, create button, strength score chips, and 1-click copy shortcuts.
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Key,
  Globe,
  Copy,
  Check,
  Shield,
  X,
  Lock,
} from 'lucide-react';
import { VaultRecordPayload } from '../../domain/vaultTypes';
import { useVault } from '../../store/VaultContext';
import { Button } from '../ui/Button';
import {
  calculatePasswordStrength,
  extractHostname,
} from '../../utils/vaultSecurity';

export interface VaultRecordItem {
  id: string;
  payload: VaultRecordPayload;
  createdAt: number;
  updatedAt: number;
}

interface VaultEntryListProps {
  records: VaultRecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewEntry: () => void;
}

export function VaultEntryList({
  records,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  onNewEntry,
}: VaultEntryListProps) {
  const { copyPassword, recordActivity } = useVault();
  const [copiedId, setCopiedId] = useState<{ id: string; type: 'user' | 'pass' } | null>(null);

  const handleCopyUsername = async (e: React.MouseEvent, id: string, username: string) => {
    e.stopPropagation();
    if (!username) return;
    recordActivity();
    try {
      await navigator.clipboard.writeText(username);
      setCopiedId({ id, type: 'user' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyPassword = async (e: React.MouseEvent, id: string, password: string) => {
    e.stopPropagation();
    if (!password) return;
    try {
      await copyPassword(password);
      setCopiedId({ id, type: 'pass' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full w-full border-r border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800/80 dark:bg-neutral-900/20">
      {/* Search & Actions Bar */}
      <div className="p-3 border-b border-neutral-200/80 dark:border-neutral-800/80 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search vault entries..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onNewEntry}
            className="h-9 px-3 gap-1 shrink-0"
            title="Create New Entry"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">New</span>
          </Button>
        </div>
      </div>

      {/* Entry List Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <Lock className="h-8 w-8 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {searchQuery ? 'No matching entries found' : 'No entries yet'}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px]">
              {searchQuery
                ? 'Try a different search query'
                : 'Click "New" to store your first encrypted credential'}
            </p>
            {!searchQuery && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onNewEntry}
                className="mt-4 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Password
              </Button>
            )}
          </div>
        ) : (
          records.map((item) => {
            const isSelected = item.id === selectedId;
            const host = extractHostname(item.payload.url);
            const strength = calculatePasswordStrength(item.payload.password);

            const isUserCopied = copiedId?.id === item.id && copiedId?.type === 'user';
            const isPassCopied = copiedId?.id === item.id && copiedId?.type === 'pass';

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item.id);
                  }
                }}
                className={`w-full group text-left p-3 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white dark:bg-neutral-800/80 border-neutral-300/80 dark:border-neutral-700 shadow-sm'
                    : 'border-transparent hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {item.payload.title || 'Untitled'}
                      </h4>
                      {host && (
                        <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded truncate max-w-[110px]">
                          {host}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {item.payload.username || 'No username'}
                    </p>
                  </div>

                  {/* Quick Copy Action Buttons (visible on hover or when selected) */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                    {item.payload.username && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyUsername(e, item.id, item.payload.username)}
                        title="Copy username"
                        className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                      >
                        {isUserCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1">User</span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyPassword(e, item.id, item.payload.password)}
                      title="Copy password"
                      className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                    >
                      {isPassCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Micro strength pill bar */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className={`h-full ${strength.bgClass}`}
                      style={{ width: `${strength.widthPercent}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-neutral-400">
                    {strength.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
