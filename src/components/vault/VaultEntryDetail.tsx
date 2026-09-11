/**
 * MATRIX Password Vault - Entry Detail View
 * 
 * Displays decrypted record data securely.
 * Features:
 * - Temporary user-controlled password visibility toggle
 * - Safe 1-click clipboard copy for username, password, and URL
 * - Strict URL sanitization (only http: and https: protocols allowed)
 * - Safe data-only rendering (no dangerouslySetInnerHTML)
 * - Edit and Delete actions
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  User,
  Globe,
  FileText,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Edit3,
  Trash2,
  Shield,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { VaultRecordPayload } from '../../domain/vaultTypes';
import { useVault } from '../../store/VaultContext';
import { Button } from '../ui/Button';
import {
  calculatePasswordStrength,
  sanitizeUrl,
  extractHostname,
} from '../../utils/vaultSecurity';

interface VaultEntryDetailProps {
  record: {
    id: string;
    payload: VaultRecordPayload;
    createdAt?: number;
    updatedAt?: number;
  } | null;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export function VaultEntryDetail({
  record,
  onEdit,
  onDeleteRequest,
  onBack,
  isMobile = false,
}: VaultEntryDetailProps) {
  const { copyPassword, clipboardCountdown, recordActivity } = useVault();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | 'url' | null>(null);

  // Always reset password visibility to hidden whenever the displayed record changes
  useEffect(() => {
    setShowPassword(false);
    setCopiedField(null);
  }, [record?.id]);

  if (!record) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-neutral-50/40 dark:bg-neutral-900/10">
        <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
          <Key className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          No Entry Selected
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mt-1">
          Select an encrypted vault entry from the list to view its credentials and details.
        </p>
      </div>
    );
  }

  const { payload } = record;
  const strength = calculatePasswordStrength(payload.password);
  const safeUrl = sanitizeUrl(payload.url);
  const displayHost = extractHostname(payload.url);

  const handleCopy = async (text: string, field: 'username' | 'password' | 'url') => {
    if (!text) return;
    try {
      if (field === 'password') {
        await copyPassword(text);
      } else {
        recordActivity();
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((curr) => (curr === field ? null : curr));
      }, 2500);
    } catch {
      // Fallback or silent catch without logging secrets
    }
  };

  const handleTogglePassword = () => {
    recordActivity();
    setShowPassword(!showPassword);
  };

  const formattedDate = record.updatedAt
    ? new Date(record.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto bg-white dark:bg-neutral-950">
      {/* Top Detail Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/70 dark:border-neutral-800/70 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Back to entries"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              {payload.title || 'Untitled Entry'}
            </h2>
            {displayHost && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate block">
                {displayHost}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEdit}
            className="gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDeleteRequest}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        {/* Username Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Username / Email
            </span>
            {payload.username && (
              <button
                type="button"
                onClick={() => handleCopy(payload.username, 'username')}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {copiedField === 'username' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <User className="h-4 w-4 text-neutral-400 shrink-0" />
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate select-all">
                {payload.username || <span className="text-neutral-400 font-normal italic">None specified</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Password
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePassword}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleCopy(payload.password, 'password')}
                title="Copies password with best-effort 45s auto-clear"
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {copiedField === 'password' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {clipboardCountdown ? `Copied (${clipboardCountdown}s)` : 'Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
            <div className="flex items-center gap-2.5 min-w-0 font-mono text-sm text-neutral-900 dark:text-neutral-100">
              <Key className="h-4 w-4 text-neutral-400 shrink-0 font-sans" />
              {showPassword ? (
                <span className="truncate select-all">{payload.password}</span>
              ) : (
                <span className="tracking-widest text-neutral-400 select-none">
                  ••••••••••••••••
                </span>
              )}
            </div>
          </div>

          {/* Strength Indicator */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1.5 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full ${strength.bgClass}`}
                style={{ width: `${strength.widthPercent}%` }}
              />
            </div>
            <span className={`text-[11px] font-medium ${strength.textClass}`}>
              {strength.label} password ({payload.password.length} chars)
            </span>
          </div>
        </div>

        {/* Website URL Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Website / URL
            </span>
            {safeUrl && (
              <button
                type="button"
                onClick={() => handleCopy(safeUrl, 'url')}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {copiedField === 'url' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <Globe className="h-4 w-4 text-neutral-400 shrink-0" />
              {safeUrl ? (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline flex items-center gap-1.5 truncate"
                >
                  <span className="truncate">{safeUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                </a>
              ) : payload.url ? (
                <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                  {payload.url}
                </span>
              ) : (
                <span className="text-sm text-neutral-400 italic">None specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Notes Field */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Notes & Recovery Codes
          </span>
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
            {payload.notes ? (
              <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
                {payload.notes}
              </p>
            ) : (
              <span className="text-sm text-neutral-400 italic">No notes recorded</span>
            )}
          </div>
        </div>

        {/* Metadata Footer */}
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Last updated {formattedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
