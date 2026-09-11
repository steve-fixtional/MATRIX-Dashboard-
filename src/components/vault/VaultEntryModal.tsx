/**
 * MATRIX Password Vault - Entry Modal (Create / Edit)
 * 
 * Supports: title, username, password, URL, notes, strength score.
 * Features real-time strength score calculation, cryptographically
 * secure password generator, and password visibility toggle.
 * All sensitive inputs are handled securely without logging.
 */

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw, Sparkles, Check, Globe, Shield, User, Lock, FileText } from 'lucide-react';
import { VaultRecordPayload } from '../../domain/vaultTypes';
import { Button } from '../ui/Button';
import {
  calculatePasswordStrength,
  generateSecurePassword,
  sanitizeUrl,
} from '../../utils/vaultSecurity';

interface VaultEntryModalProps {
  isOpen: boolean;
  initialRecord?: { id?: string; payload: VaultRecordPayload } | null;
  onClose: () => void;
  onSave: (payload: VaultRecordPayload, id?: string) => Promise<void>;
}

export function VaultEntryModal({
  isOpen,
  initialRecord,
  onClose,
  onSave,
}: VaultEntryModalProps) {
  const isEditing = !!initialRecord?.id;

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGeneratorOptions, setShowGeneratorOptions] = useState(false);
  const [genLength, setGenLength] = useState(20);

  // Initialize form state when opened or when initialRecord changes
  useEffect(() => {
    if (isOpen) {
      if (initialRecord?.payload) {
        setTitle(initialRecord.payload.title || '');
        setUsername(initialRecord.payload.username || '');
        setPassword(initialRecord.payload.password || '');
        setUrl(initialRecord.payload.url || '');
        setNotes(initialRecord.payload.notes || '');
      } else {
        setTitle('');
        setUsername('');
        setPassword('');
        setUrl('');
        setNotes('');
      }
      setShowPassword(false);
      setError(null);
      setShowGeneratorOptions(false);
    }
  }, [isOpen, initialRecord]);

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(password);
  const sanitizedUrlDisplay = sanitizeUrl(url);

  const handleGenerate = (length: number = genLength) => {
    const generated = generateSecurePassword({ length });
    setPassword(generated);
    setShowPassword(true); // Temporarily show so user sees what was generated
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: VaultRecordPayload = {
        title: title.trim(),
        username: username.trim(),
        password: password,
        url: url.trim(),
        notes: notes.trim(),
        strengthScore: strength.score,
      };

      await onSave(payload, initialRecord?.id);
      onClose();
    } catch {
      setError('Failed to save encrypted vault record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-entry-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <Lock className="h-4 w-4" />
            </div>
            <h3
              id="vault-entry-modal-title"
              className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {isEditing ? 'Edit Vault Entry' : 'New Vault Entry'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label
              htmlFor="entry-title"
              className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="entry-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub, AWS Console, Work Email..."
              required
              autoFocus
              className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
            />
          </div>

          {/* Username / Email */}
          <div>
            <label
              htmlFor="entry-username"
              className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1"
            >
              Username / Email
            </label>
            <div className="relative">
              <input
                id="entry-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. user@matrix.internal"
                autoComplete="off"
                className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 pl-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
              />
              <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="entry-password"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Password <span className="text-red-500">*</span>
              </label>

              {/* Quick Generator Trigger */}
              <button
                type="button"
                onClick={() => setShowGeneratorOptions(!showGeneratorOptions)}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
                <span>Generate</span>
              </button>
            </div>

            {/* Password Generator Panel */}
            {showGeneratorOptions && (
              <div className="mb-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                    Length: {genLength} chars
                  </span>
                  <div className="flex gap-1">
                    {[16, 20, 24, 32].map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          setGenLength(len);
                          handleGenerate(len);
                        }}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          genLength === len
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium'
                            : 'bg-neutral-200/60 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleGenerate(genLength)}
                  className="w-full gap-1.5 text-xs h-8"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Generate New Password</span>
                </Button>
              </div>
            )}

            <div className="relative">
              <input
                id="entry-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or generate password..."
                required
                autoComplete="off"
                className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 pr-11 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-10 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 dark:text-neutral-400">Strength:</span>
                  <span className={`font-medium ${strength.textClass}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${strength.bgClass}`}
                    style={{ width: `${strength.widthPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Website / Service URL */}
          <div>
            <label
              htmlFor="entry-url"
              className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1"
            >
              Website URL
            </label>
            <div className="relative">
              <input
                id="entry-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoComplete="off"
                className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 pl-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
              />
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            </div>
            {url.trim() && !sanitizedUrlDisplay && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Notice: Please enter a valid web URL (http:// or https://).
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="entry-notes"
              className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1"
            >
              Notes & Recovery Codes
            </label>
            <textarea
              id="entry-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Security questions, backup codes, or account notes (encrypted)..."
              className="flex w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400 resize-y"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving || !title.trim() || !password.trim()}
              className="gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Encrypting...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Entry'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
