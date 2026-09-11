/**
 * MATRIX Password Vault - Main Page
 * 
 * Secure user interface for the zero-knowledge credential vault.
 * Seamlessly integrates with MATRIX layout, typography, and theme.
 * 
 * Enforces:
 * - Complete lock boundary (zero decrypted data while locked)
 * - Prominent "Lock Vault" action immediately invoking central lock
 * - Decrypted data operations only through secure Vault context
 * - Deliberate deletion workflow
 * - Safe URL handling & data-only rendering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Shield,
  ShieldCheck,
  Search,
  RefreshCw,
  EyeOff,
  ClipboardCheck,
  Download,
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useVault } from '../store/VaultContext';
import { VaultRecordPayload } from '../domain/vaultTypes';
import { VaultLockedView } from '../components/vault/VaultLockedView';
import { VaultInitView } from '../components/vault/VaultInitView';
import { VaultEntryList, VaultRecordItem } from '../components/vault/VaultEntryList';
import { VaultEntryDetail } from '../components/vault/VaultEntryDetail';
import { VaultEntryModal } from '../components/vault/VaultEntryModal';
import { DeleteConfirmDialog } from '../components/vault/DeleteConfirmDialog';
import { VaultSecurityModal } from '../components/vault/VaultSecurityModal';
import { VaultBackupModal } from '../components/vault/VaultBackupModal';
import { Button } from '../components/ui/Button';

export function Passwords() {
  const {
    state,
    isUnlocked,
    isLocked,
    isUninitialized,
    listRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    lock,
    strictVisibility,
    clipboardCountdown,
    inactivityTimeout,
  } = useVault();

  const [records, setRecords] = useState<VaultRecordItem[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [modalRecordToEdit, setModalRecordToEdit] = useState<{ id?: string; payload: VaultRecordPayload } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupModalInitialTab, setBackupModalInitialTab] = useState<'export' | 'import'>('export');

  // Load decrypted records only when unlocked
  const loadRecords = useCallback(async () => {
    if (!isUnlocked) {
      setRecords([]);
      return;
    }
    setIsLoadingRecords(true);
    try {
      const items = await listRecords();
      setRecords(items);
      // If previously selected item was deleted, clear selection or select first
      if (selectedRecordId && !items.some((item) => item.id === selectedRecordId)) {
        setSelectedRecordId(null);
      }
    } catch {
      // Handled cleanly by vault runtime service
    } finally {
      setIsLoadingRecords(false);
    }
  }, [isUnlocked, listRecords, selectedRecordId]);

  // Sync records when unlocked status changes
  useEffect(() => {
    if (isUnlocked) {
      loadRecords();
    } else {
      // Ensure zero decrypted records remain in component state when locked
      setRecords([]);
      setSelectedRecordId(null);
      setIsEntryModalOpen(false);
      setIsDeleteDialogOpen(false);
    }
  }, [isUnlocked]);

  // Central lock handler
  const handleLock = () => {
    setRecords([]);
    setSelectedRecordId(null);
    setIsEntryModalOpen(false);
    setIsDeleteDialogOpen(false);
    lock();
  };

  // Filtered records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      const titleMatch = (r.payload.title || '').toLowerCase().includes(q);
      const userMatch = (r.payload.username || '').toLowerCase().includes(q);
      const urlMatch = (r.payload.url || '').toLowerCase().includes(q);
      const notesMatch = (r.payload.notes || '').toLowerCase().includes(q);
      return titleMatch || userMatch || urlMatch || notesMatch;
    });
  }, [records, searchQuery]);

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null;
    return records.find((r) => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  // Create or Update record
  const handleSaveEntry = async (payload: VaultRecordPayload, id?: string) => {
    if (id) {
      await updateRecord(id, payload);
    } else {
      const created = await createRecord(payload);
      setSelectedRecordId(created.id);
    }
    await loadRecords();
  };

  // Delete record with deliberate action
  const handleConfirmDelete = async () => {
    if (!selectedRecordId) return;
    setIsDeleting(true);
    try {
      await deleteRecord(selectedRecordId);
      setSelectedRecordId(null);
      setIsDeleteDialogOpen(false);
      await loadRecords();
    } catch {
      // Handled cleanly
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalRecordToEdit(null);
    setIsEntryModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedRecord) return;
    setModalRecordToEdit({
      id: selectedRecord.id,
      payload: selectedRecord.payload,
    });
    setIsEntryModalOpen(true);
  };

  return (
    <PageWrapper className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] p-0 md:p-4 overflow-hidden">
      <div className="flex flex-col h-full bg-white dark:bg-neutral-950 md:rounded-2xl md:border border-neutral-200 dark:border-neutral-800 md:shadow-sm overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Password Vault
                </h1>
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                )}

                {/* Strict Visibility Indicator */}
                {strictVisibility && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                    title="Strict Tab Lock is active: switching tabs locks the vault"
                  >
                    <EyeOff className="h-2.5 w-2.5" />
                    Strict Tab Lock
                  </span>
                )}

                {/* Active Clipboard Countdown Indicator */}
                {clipboardCountdown !== null && clipboardCountdown > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
                    title={`Password in clipboard: clears automatically in ${clipboardCountdown}s`}
                  >
                    <ClipboardCheck className="h-2.5 w-2.5" />
                    Clears in {clipboardCountdown}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBackupModalInitialTab(isUnlocked ? 'export' : 'import');
                setIsBackupModalOpen(true);
              }}
              className="gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              title="Encrypted backup: export or restore"
            >
              <Download className="h-3.5 w-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Backup</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSecurityModalOpen(true)}
              className="gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              title="Vault security settings: inactivity auto-lock and tab visibility"
            >
              <Shield className="h-3.5 w-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Security</span>
            </Button>

            {isUnlocked && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLock}
                  className="gap-1.5 text-xs text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 border border-neutral-300 dark:border-neutral-700"
                  title="Lock vault immediately"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span className="font-medium">Lock Vault</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Entry</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Body Content Based On Vault State */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isUninitialized ? (
            <div className="h-full overflow-y-auto flex items-center justify-center">
              <VaultInitView onInitSuccess={loadRecords} />
            </div>
          ) : !isUnlocked ? (
            <div className="h-full overflow-y-auto flex items-center justify-center">
              <VaultLockedView onUnlockSuccess={loadRecords} />
            </div>
          ) : (
            /* Unlocked 2-Pane View */
            <div className="flex h-full overflow-hidden">
              {/* Left Pane: Entry List */}
              <div
                className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
                  selectedRecordId ? 'hidden md:flex' : 'flex'
                }`}
              >
                <VaultEntryList
                  records={filteredRecords}
                  selectedId={selectedRecordId}
                  onSelect={setSelectedRecordId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onNewEntry={handleOpenCreateModal}
                />
              </div>

              {/* Right Pane: Entry Detail */}
              <div
                className={`flex-1 h-full min-w-0 ${
                  selectedRecordId ? 'flex' : 'hidden md:flex'
                } bg-white dark:bg-neutral-950`}
              >
                <VaultEntryDetail
                  record={selectedRecord}
                  onEdit={handleOpenEditModal}
                  onDeleteRequest={() => setIsDeleteDialogOpen(true)}
                  onBack={() => setSelectedRecordId(null)}
                  isMobile={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entry Modal (Create / Edit) */}
      <VaultEntryModal
        isOpen={isEntryModalOpen}
        initialRecord={modalRecordToEdit}
        onClose={() => {
          setIsEntryModalOpen(false);
          setModalRecordToEdit(null);
        }}
        onSave={handleSaveEntry}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        itemTitle={selectedRecord?.payload.title || 'this entry'}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Vault Security Settings Modal */}
      <VaultSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onOpenBackupModal={(tab) => {
          setBackupModalInitialTab(tab);
          setIsBackupModalOpen(true);
        }}
      />

      {/* Vault Encrypted Backup & Restore Modal */}
      <VaultBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        initialTab={backupModalInitialTab}
        onRestoreSuccess={() => {
          loadRecords();
        }}
      />
    </PageWrapper>
  );
}
export default Passwords;
