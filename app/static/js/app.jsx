const { useState, useEffect, useCallback, useRef } = React;

const QUOTAS = {
    "free": 5,
    "premium": 20,
};

const createNewCharacter = () => ({
  id: crypto.randomUUID(),
  name: "New Hero",
  className: "Fighter",
  level: 1,
  race: "Human", background: "Acolyte", alignment: "Lawful Good",
  playerName: "", experience: 0,
  abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
  inspiration: 0, proficiencyBonus: 2,
  savingThrows: { strength: { proficient: false }, dexterity: { proficient: false }, constitution: { proficient: false }, intelligence: { proficient: false }, wisdom: { proficient: false }, charisma: { proficient: false } },
  skills: { acrobatics: { proficient: false }, animalHandling: { proficient: false }, arcana: { proficient: false }, athletics: { proficient: false }, deception: { proficient: false }, history: { proficient: false }, insight: { proficient: false }, intimidation: { proficient: false }, investigation: { proficient: false }, medicine: { proficient: false }, nature: { proficient: false }, perception: { proficient:false }, performance: { proficient: false }, persuasion: { proficient: false }, religion: { proficient: false }, sleightOfHand: { proficient: false }, stealth: { proficient: false }, survival: { proficient: false } },
  armorClass: 10, initiative: 0, speed: "30ft", maxHp: 10, currentHp: 10, tempHp: 0,
  hitDice: { total: "1d10", remaining: 1 },
  deathSaves: { successes: 0, failures: 0 },
  attacks: [{ name: "Longsword", bonus: "+3", damage: "1d8+1 slashing" }],
  equipment: "Backpack, bedroll, 10 torches...",
  currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
  personalityTraits: "", ideals: "", bonds: "", flaws: "",
  features: "Fighting Style, Second Wind",
  proficienciesAndLanguages: "Light, medium, heavy armor, shields, simple and martial weapons. Common, Elvish.",
  appearance: "", imageUrl: "", adventureHook: "",
  spellcasting: {
      ability: 'intelligence',
      cantrips: [],
      levels: Array(9).fill(null).map(() => ({
          slotsTotal: 0,
          slotsExpended: 0,
          spells: []
      }))
  }
});

const SKILL_NAMES = {
    acrobatics: { name: "Acrobatics", ability: "dexterity" }, animalHandling: { name: "Animal Handling", ability: "wisdom" },
    arcana: { name: "Arcana", ability: "intelligence" }, athletics: { name: "Athletics", ability: "strength" },
    deception: { name: "Deception", ability: "charisma" }, history: { name: "History", ability: "intelligence" },
    insight: { name: "Insight", ability: "wisdom" }, intimidation: { name: "Intimidation", ability: "charisma" },
    investigation: { name: "Investigation", ability: "intelligence" }, medicine: { name: "Medicine", ability: "wisdom" },
    nature: { name: "Nature", ability: "intelligence" }, perception: { name: "Perception", ability: "wisdom" },
    performance: { name: "Performance", ability: "charisma" }, persuasion: { name: "Persuasion", ability: "charisma" },
    religion: { name: "Religion", ability: "intelligence" }, sleightOfHand: { name: "Sleight of Hand", ability: "dexterity" },
    stealth: { name: "Stealth", ability: "dexterity" }, survival: { name: "Survival", ability: "wisdom" },
};

const SAVING_THROW_NAMES = {
    strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
    intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};

// --- Helper Functions & Constants ---
const getModifier = (score) => Math.floor((score - 10) / 2);

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

    const handleLogin = async (email, password) => {
        const response = await fetch('/auth/jwt/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: email, password: password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Login failed");
        }
        const userResponse = await fetch('/users/me');
        const user = await userResponse.json();
        setCurrentUser(user);
    };

    const handleRegister = async (email, password) => {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            const message = Array.isArray(errorData.detail) ? errorData.detail[0].msg : errorData.detail;
            throw new Error(message || "Registration failed");
        }
        await handleLogin(email, password);
    };

    const handleLogout = async () => {
        await fetch('/auth/jwt/logout', { method: 'POST' });
        setCurrentUser(null);
        setSelectedCharacterId(null);
    };

    const refreshCurrentUser = async () => {
        try {
            const userResponse = await fetch('/users/me');
            if (userResponse.ok) {
                const user = await userResponse.json();
                setCurrentUser(user);
            } else {
                console.error("Failed to refresh user data:", userResponse.statusText);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    const callGeminiAPI = async (prompt, jsonSchema = null) => {
        const payload = { prompt, json_schema: jsonSchema, is_image: false };
        try {
            const response = await fetch("/api/gemini/proxy", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || `API Error: ${response.status}`);
            }
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) { throw new Error("Invalid or empty API response."); }
            await refreshCurrentUser(); // Refresh user data after successful generation
            return text;
        } catch (error) {
            console.error("Error calling Gemini proxy:", error);
            alert(`An error occurred while generating text: ${error.message}`);
            return null;
        }
    };

    const callImagenAPI = async (prompt) => {
        const payload = { prompt, is_image: true };
        try {
            const response = await fetch("/api/gemini/proxy", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || `API Error: ${response.status}`);
            }
            const result = await response.json();
            const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;
            if (!base64Data) { throw new Error("Invalid or empty API response for image."); }
            return `data:image/png;base64,${base64Data}`;
        } catch (error) {
            console.error("Error calling Imagen proxy:", error);
            alert(`An error occurred while generating the image: ${error.message}`);
            return null;
        }
    };

    const handleCreateCharacter = async () => {
        const newChar = createNewCharacter();
        try {
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChar),
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 alert(`Failed to create character: ${errorData.detail}`);
                 throw new Error(errorData.detail);
            }
            const savedChar = await response.json();
            // No need to update state, we are redirecting
            window.location.href = `/character/sheet/${savedChar.id}`;
        } catch (error) {
            console.error("Failed to create character:", error);
        }
    };

    const handleFullGenerateCharacter = async (concept, onProgress) => {
        console.log("Generating character with concept:", concept);

        const schema = {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "The character's name." },
                className: { type: "STRING", description: "The character's class name, e.g., 'Fighter'." },
                level: { type: "INTEGER", description: "The character's level, e.g., 1." },
                race: { type: "STRING", description: "The character's race, e.g., 'Human'." },
                background: { type: "STRING", description: "The character's background, e.g., 'Acolyte'." },
                alignment: { type: "STRING", description: "The character's alignment, e.g., 'Lawful Good'." },
                abilityScores: {
                    type: "OBJECT",
                    properties: {
                        strength: { type: "INTEGER", description: "The character's strength score (between 3 and 18)." },
                        dexterity: { type: "INTEGER", description: "The character's dexterity score (between 3 and 18)." },
                        constitution: { type: "INTEGER", description: "The character's constitution score (between 3 and 18)." },
                        intelligence: { type: "INTEGER", description: "The character's intelligence score (between 3 and 18)." },
                        wisdom: { type: "INTEGER", description: "The character's wisdom score (between 3 and 18)." },
                        charisma: { type: "INTEGER", description: "The character's charisma score (between 3 and 18)." },
                    },
                    required: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
                },
                appearance: { type: "STRING", description: "A brief description of the character's physical appearance (2-3 sentences)." },
                personalityTraits: { type: "STRING", description: "The character's main personality trait." },
                ideals: { type: "STRING", description: "The character's main ideal." },
                bonds: { type: "STRING", description: "The character's main bond." },
                flaws: { type: "STRING", description: "The character's main flaw." },
            },
            required: ["name", "className", "level", "race", "background", "alignment", "abilityScores", "appearance", "personalityTraits", "ideals", "bonds", "flaws"],
        };

        try {
            onProgress?.("Fetching game data...");
            // Fetch Open5e data
            const [classes, species, backgrounds] = await Promise.all([
                fetch('/api/open5e/classes?limit=20').then(res => res.json()),
                fetch('/api/open5e/species?limit=40').then(res => res.json()),
                fetch('/api/open5e/backgrounds?limit=50').then(res => res.json())
            ]);

            const classNames = classes.map(c => c.name);
            const speciesNames = species.map(s => s.name);
            const backgroundNames = backgrounds.map(b => b.name);

            const prompt = `
                You are a D&D expert creating a new character.
                The user's concept is: "${concept}".

                Generate a complete D&D 5e character sheet following the provided JSON schema.

                You MUST use one of the following options for the character's class, race, and background.
                - **Available Classes**: ${classNames.join(", ")}
                - **Available Races (Species)**: ${speciesNames.join(", ")}
                - **Available Backgrounds**: ${backgroundNames.join(", ")}

                Based on the chosen class, ensure the ability scores, features, and proficiencies are accurate for a level ${schema.properties.level.description} character.
                For ability scores, use a standard array or point buy method, but feel free to adjust them to fit the character concept.
                The final output must be only the JSON object, adhering strictly to the schema.
            `;

            onProgress?.("Generating character...");
            const generatedJson = await callGeminiAPI(prompt, schema);
            if (!generatedJson) {
                onProgress?.("Failed to generate character details.");
                return null;
            }

            const parsedData = JSON.parse(generatedJson);
            const newChar = {
                ...createNewCharacter(),
                ...parsedData,
                id: crypto.randomUUID(), // Ensure a new ID is generated
            };

            // Generate portrait
            onProgress?.("Creating character portrait with AI...");
            const portraitPrompt = `Fantasy character portrait, D&D style. ${newChar.appearance}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`;
            const imageUrl = await callImagenAPI(portraitPrompt);
            if (imageUrl) {
                newChar.imageUrl = imageUrl;
            } else {
                onProgress?.("Portrait generation failed, continuing without one.");
            }

            // Save the character
            onProgress?.("Saving your new hero...");
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChar),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                alert(`Failed to save character: ${errorBody.detail}`);
                throw new Error(`Failed to save character: ${errorBody.detail}`);
            }

            const savedChar = await response.json();
            setCharacters(prev => [...prev, savedChar]);
            setSelectedCharacterId(savedChar.id);
            await refreshCurrentUser(); // Refresh user data after character is saved
            onProgress?.("Done!");
            return savedChar;

        } catch (error) {
            console.error("Full character generation failed:", error);
            onProgress?.(`An error occurred: ${error.message}`);
            return null;
        }
    };

    const handleSelectCharacter = (id) => { setSelectedCharacterId(id); };

    const handleUpdateCharacter = useCallback(async (updatedCharacter) => {
        try {
            const response = await fetch(`/api/characters/${updatedCharacter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCharacter),
            });
            if (!response.ok) throw new Error('Failed to update character');
            const updatedFromServer = await response.json();
            setCharacters(prev => prev.map(char => char.id === updatedFromServer.id ? updatedFromServer : char));
        } catch (error) {
            console.error("Failed to update character:", error);
            // Optionally revert state or notify user
        }
    }, []);

    const handleUpdateCharacterLayout = (characterId, layout) => {
        setCharacters(prev => prev.map(char =>
            char.id === characterId ? { ...char, layout: layout } : char
        ));
    };

    const handleDeleteCharacter = async (id) => {
        if (window.confirm("Are you sure you want to delete this character? This action is irreversible.")) {
            try {
                const response = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete character');
                setCharacters(prev => prev.filter(c => c.id !== id));
                if (selectedCharacterId === id) setSelectedCharacterId(null);
            } catch (error) {
                console.error("Failed to delete character:", error);
                alert("Failed to delete character from the database.");
            }
        }
    };

    const handleBackToSelector = () => {
        setSelectedCharacterId(null);
        window.history.pushState({}, '', '/');
    };
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
    const isCharacterSheetPage = window.location.pathname.startsWith('/character/sheet/');

    if (!authChecked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-title">Loading the Tavern...</h1>
            </div>
        );
    }

    return (
        <>
            {currentUser ? (
                <div className="min-h-screen">
                    <BurgerMenu currentUser={currentUser} onLogout={handleLogout} />
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
                            <CharacterSelector characters={characters} onSelect={handleSelectCharacter} onCreate={handleCreateCharacter} onDelete={handleDeleteCharacter} onFullGenerate={handleFullGenerateCharacter} />
                        ) : selectedCharacter ? (
                            <CharacterSheet user={currentUser} character={selectedCharacter} onUpdate={handleUpdateCharacter} onBack={handleBackToSelector} callGeminiAPI={callGeminiAPI} callImagenAPI={callImagenAPI} onUpdateLayout={handleUpdateCharacterLayout} />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-4">
                                <h1 className="text-4xl font-title">Loading Character...</h1>
                            </div>
                        )}
                    </main>
                </div>
            ) : (
                <AuthForm onLogin={handleLogin} onRegister={handleRegister} registrationsEnabled={window.REGISTRATIONS_ENABLED} />
            )}
        </>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
