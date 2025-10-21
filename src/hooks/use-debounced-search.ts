import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for debounced search to reduce API calls
 */
export function useDebouncedSearch<T>(
  searchFn: (term: string) => Promise<T>,
  delay: number = 300,
  minLength: number = 2
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  // Perform search when debounced term changes
  useEffect(() => {
    if (debouncedTerm.length < minLength) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const searchResults = await searchFn(debouncedTerm);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedTerm, searchFn, minLength]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
    setResults(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    results,
    loading,
    error,
    clearSearch,
    isSearching: loading && debouncedTerm.length >= minLength
  };
}

/**
 * Hook for debounced value (useful for form inputs)
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
