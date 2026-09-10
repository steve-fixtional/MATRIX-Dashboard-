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

  useEffect(() => {
    const search = async () => {
      try {
        const staticGroups = getStaticCommands(query, navigate);
        
        let searchGroups: CommandGroup[] = [];
        if (query.trim() !== '') {
          const res = await performUniversalSearch(query);
          searchGroups = mapSearchResultsToCommands(res, navigate);
        }

        const allGroups = [...staticGroups, ...searchGroups];
        setCommandGroups(allGroups);
        
        const flat = allGroups.reduce((acc, group) => [...acc, ...group.commands], [] as CommandItem[]);
        setFlatCommands(flat);
      } catch (err) {
        console.error("Error in command search:", err);
      }
    };
    
    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [query, navigate]);

  return { commandGroups, flatCommands };
}
