const { useState, useEffect, useRef } = React;

// Custom hook for debouncing
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const SearchableSelect = ({ resourceType, value, onSelect, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState(value || "");
    const [results, setResults] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const wrapperRef = useRef(null);
    const observer = useRef();

    const lastResultElementRef = useCallback(node => {
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [hasMore]);

    useEffect(() => {
        setSearchTerm(value || "");
    }, [value]);

    useEffect(() => {
        setResults([]);
        setPage(1);
        setHasMore(true);
    }, [debouncedSearchTerm, resourceType]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchResults = async () => {
            if (!hasMore) return;
            let url = `/api/open5e/${resourceType}?page=${page}&limit=10`;
            if (debouncedSearchTerm) {
                url += `&search=${debouncedSearchTerm}`;
            }
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                setResults(prevResults => {
                    // Create a Set of existing result IDs for quick lookup
                    const existingIds = new Set(prevResults.map(r => r._id));
                    // Filter out duplicates from the new data
                    const newData = data.filter(d => !existingIds.has(d._id));
                    return [...prevResults, ...newData];
                });
                setHasMore(data.length > 0);
            } catch (error) {
                console.error(`Failed to fetch ${resourceType}:`, error);
            }
        };

        fetchResults();
    }, [debouncedSearchTerm, resourceType, isOpen, page, hasMore]);


    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (item) => {
        onSelect(item);
        setSearchTerm(item.name);
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full theme-dnd-input"
            />
            {isOpen && (
                <ul className="absolute z-50 w-full bg-parchment border-2 border-theme rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {results.map((item, index) => {
                        const isLastElement = index === results.length - 1;
                        return (
                            <li
                                ref={isLastElement ? lastResultElementRef : null}
                                key={item.key || item._id}
                                onClick={() => handleSelect(item)}
                                className="p-2 text-wood-dark hover:bg-wood-light hover:text-parchment cursor-pointer"
                            >
                                {item.name}
                                {item.document?.name && <span className="text-xs text-gray-500 ml-2">({item.document.name})</span>}
                            </li>
                        );
                    })}
                    {!hasMore && results.length === 0 && (
                         <li className="p-2 text-wood-dark italic">No results found.</li>
                    )}
                </ul>
            )}
        </div>
    );
};
