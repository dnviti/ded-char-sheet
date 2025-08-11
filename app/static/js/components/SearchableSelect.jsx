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
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedSearchTerm.length < 2) {
                setResults([]);
                return;
            }
            try {
                const response = await fetch(`/api/open5e/${resourceType}?search=${debouncedSearchTerm}`);
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error(`Failed to fetch ${resourceType}:`, error);
                setResults([]);
            }
        };

        if (isOpen) {
            fetchResults();
        }
    }, [debouncedSearchTerm, resourceType, isOpen]);

    // Hook to close dropdown when clicking outside
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

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={searchTerm || value}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full bg-transparent focus:outline-none focus:bg-white/20 rounded-md p-1"
            />
            {isOpen && (
                <ul className="absolute z-10 w-full bg-white border border-stone-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {results.length > 0 ? (
                        results.map((item) => (
                            <li
                                key={item.key || item._id}
                                onClick={() => handleSelect(item)}
                                className="p-2 hover:bg-stone-100 cursor-pointer"
                            >
                                {item.name}
                                {item.document?.name && <span className="text-xs text-stone-500 ml-2">({item.document.name})</span>}
                            </li>
                        ))
                    ) : (
                        <li className="p-2 text-stone-500 italic">
                            {debouncedSearchTerm.length < 2 ? "Type to search..." : "No results found."}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
