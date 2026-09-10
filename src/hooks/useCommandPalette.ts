import React, { useState, useEffect, useRef } from 'react';
import { useCommands } from './useCommands';
import { CommandItem } from '../services/command/commandTypes';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { commandGroups, flatCommands } = useCommands(query);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for global toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Expose toggle to window for other components
  useEffect(() => {
    (window as any).toggleCommandPalette = () => setIsOpen(prev => !prev);
    return () => {
      delete (window as any).toggleCommandPalette;
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [commandGroups]);

  const handleSelect = (command: CommandItem) => {
    setIsOpen(false);
    command.onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(flatCommands.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatCommands.length) % Math.max(flatCommands.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatCommands.length > 0) {
        handleSelect(flatCommands[selectedIndex]);
      }
    }
  };

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    inputRef,
    commandGroups,
    flatCommands,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    handleSelect
  };
}
