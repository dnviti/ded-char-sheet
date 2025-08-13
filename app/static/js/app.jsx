const { useState, useEffect, useCallback, useRef } = React;

function App() {
    const [characters, setCharacters] = useState([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(window.USER);
    const [authChecked, setAuthChecked] = useState(true);

    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/character\/sheet\/(.+)/);
        if (match) {
            setSelectedCharacterId(match[1]);
        }
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setCharacters([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const charsResponse = await fetch('/api/characters');

                if (charsResponse.status === 401) {
                    setCurrentUser(null); // Token is invalid, log out
                    return;
                }

                if (!charsResponse.ok) throw new Error("Could not fetch characters");
                const charsData = await charsResponse.json();
                setCharacters(charsData);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                setCurrentUser(null); // Log out on error
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);


    const handleSelectCharacter = (id) => { setSelectedCharacterId(id); };

    const handleUpdateCharacterLayout = (characterId, layout) => {
        setCharacters(prev => prev.map(char =>
            char.id === characterId ? { ...char, layout: layout } : char
        ));
    };

    const handleBackToSelector = () => {
        setSelectedCharacterId(null);
        window.history.pushState({}, '', '/');
    };

    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
    const isCharacterSheetPage = window.location.pathname.startsWith('/character/sheet/');

    if (!authChecked || !currentUser) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-title">Loading the Tavern...</h1>
            </div>
        );
    }

    const onLogout = () => handleLogout(setCurrentUser, setSelectedCharacterId);
    const onDeleteCharacter = (id) => handleDeleteCharacter(id, selectedCharacterId, setSelectedCharacterId, setCharacters);
    const onUpdateCharacter = (character) => handleUpdateCharacter(character, setCharacters);
    const onCreateCharacter = () => handleCreateCharacter(setCharacters);

    const onFullGenerate = (concept, onProgress) => {
        return handleFullGenerateCharacter(concept, onProgress, setCharacters, setSelectedCharacterId, setCurrentUser);
    };

    const geminiApiCall = (prompt, jsonSchema) => {
        return callGeminiAPI(prompt, jsonSchema, refreshCurrentUser, setCurrentUser);
    }

    return (
        <div className="min-h-screen">
            <BurgerMenu currentUser={currentUser} onLogout={onLogout} />
            <header className="bg-wood-light border-b-4 border-theme p-4 flex justify-center items-center shadow-lg print:hidden relative">
                <div className="flex items-center">
                    <h1 className="text-3xl font-title">Character Keep</h1>
                    <span className="ml-4 text-xs bg-red-800 text-white font-bold px-2 py-1 rounded-full">v0.1.0 Alpha</span>
                </div>
                {currentUser.is_superuser && (
                    <a href="/admin" className="theme-dnd-button absolute right-4">Admin</a>
                )}
            </header>
            <main className="p-4 md:p-8">
                {loading && !selectedCharacter ? (
                     <div className="flex flex-col items-center justify-center p-4">
                        <h1 className="text-4xl font-title">Loading Heroes...</h1>
                    </div>
                ) : !selectedCharacterId || !isCharacterSheetPage ? (
                    <CharacterSelector characters={characters} onSelect={handleSelectCharacter} onCreate={onCreateCharacter} onDelete={onDeleteCharacter} onFullGenerate={onFullGenerate} />
                ) : selectedCharacter ? (
                    <CharacterSheet user={currentUser} character={selectedCharacter} onUpdate={onUpdateCharacter} onBack={handleBackToSelector} callGeminiAPI={geminiApiCall} callImagenAPI={callImagenAPI} onUpdateLayout={handleUpdateCharacterLayout} />
                ) : (
                    <div className="flex flex-col items-center justify-center p-4">
                        <h1 className="text-4xl font-title">Loading Character...</h1>
                    </div>
                )}
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
