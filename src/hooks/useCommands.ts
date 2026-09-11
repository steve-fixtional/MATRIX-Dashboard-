import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performUniversalSearch } from '../services/searchEngine';
import { mapSearchResultsToCommands } from '../services/command/commandMapper';
import { getStaticCommands } from '../services/command/commandDefinitions';
import { CommandGroup, CommandItem } from '../services/command/commandTypes';

export function useCommands(query: string) {
  const navigate = useNavigate();
  const [commandGroups, setCommandGroups] = useState<CommandGroup[]>([]);
  const [flatCommands, setFlatCommands] = useState<CommandItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    
    const search = async () => {
      if (!query.trim()) {
        setCommandGroups([]);
        setFlatCommands([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const staticGroups = getStaticCommands(query, navigate);
        
        const res = await performUniversalSearch(query);
        const searchGroups = mapSearchResultsToCommands(res, navigate);

        if (isActive) {
          const allGroups = [...staticGroups, ...searchGroups];
          // Sort groups so Actions are always at top or grouped logically
          setCommandGroups(allGroups);
          
          const flat = allGroups.reduce((acc, group) => [...acc, ...group.commands], [] as CommandItem[]);
          setFlatCommands(flat);
        }
      } catch (err: any) {
        if (isActive) {
          console.error("Error in command search:", err);
          setError(err);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    
    const timer = setTimeout(search, 200);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query, navigate]);

  return { commandGroups, flatCommands, isLoading, error };
}
