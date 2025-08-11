const { useState, useEffect, useCallback, useRef } = React;

// --- Helper Functions & Constants ---
const getModifier = (score) => Math.floor((score - 10) / 2);

const createNewCharacter = () => ({
  id: crypto.randomUUID(),
  name: "New Hero", classLevel: "Fighter 1", race: "Human", background: "Acolyte", alignment: "Lawful Good",
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

function App() {
    const [characters, setCharacters] = useState([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const response = await fetch('/api/gemini-key');
                if (!response.ok) throw new Error("Could not fetch API key");
                const data = await response.json();
                setApiKey(data.apiKey);
            } catch (error) {
                console.error("Failed to fetch Gemini API key:", error);
                alert("Failed to fetch Gemini API key. Make sure it's configured on the server.");
            }
        };
        fetchApiKey();
    }, []);

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/characters');
                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();
                setCharacters(data);
            } catch (error) {
                console.error("Failed to fetch characters:", error);
                alert("Failed to load characters from the database.");
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, []);

    const callGeminiAPI = async (prompt, jsonSchema = null) => {
        if (!apiKey) {
            alert("Gemini API key is not available.");
            return null;
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }], ...(jsonSchema && { generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema } }) };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorBody = await response.text(); throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorBody}`); }
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) { throw new Error("Invalid or empty API response."); }
            return text;
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            alert(`An error occurred while generating text: ${error.message}`);
            return null;
        }
    };

    const callImagenAPI = async (prompt) => {
        if (!apiKey) {
            alert("Imagen API key is not available.");
            return null;
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        const payload = { instances: [{ prompt: prompt }], parameters: { "sampleCount": 1 } };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorBody = await response.text(); throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorBody}`); }
            const result = await response.json();
            const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;
            if (!base64Data) { throw new Error("Invalid or empty API response for image."); }
            return `data:image/png;base64,${base64Data}`;
        } catch (error) {
            console.error("Error calling Imagen API:", error);
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
            if (!response.ok) throw new Error('Failed to create character');
            const savedChar = await response.json();
            setCharacters(prev => [...prev, savedChar]);
            setSelectedCharacterId(savedChar.id);
        } catch (error) {
            console.error("Failed to create character:", error);
            alert("Failed to save new character to the database.");
        }
    };

    const handleFullGenerateCharacter = async (concept) => {
        console.log("Generating character with concept:", concept);
        if (!apiKey) {
            alert("API Key not configured. Full generation is not available.");
            return;
        }

        const schema = {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "The character's name." },
                classLevel: { type: "STRING", description: "The character's class and level, e.g., 'Fighter 1'." },
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
            required: ["name", "classLevel", "race", "background", "alignment", "abilityScores", "appearance", "personalityTraits", "ideals", "bonds", "flaws"],
        };

        const prompt = `You are a D&D expert. Generate a complete level 1 character sheet based on this concept: "${concept}". Follow the provided JSON schema precisely.`;

        try {
            const generatedJson = await callGeminiAPI(prompt, schema);
            if (!generatedJson) return;

            const parsedData = JSON.parse(generatedJson);
            const newChar = {
                ...createNewCharacter(),
                ...parsedData,
                id: crypto.randomUUID(), // Ensure a new ID is generated
            };

            // Generate portrait
            const portraitPrompt = `Fantasy character portrait, D&D style. ${newChar.appearance}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`;
            const imageUrl = await callImagenAPI(portraitPrompt);
            if (imageUrl) {
                newChar.imageUrl = imageUrl;
            }

            // Save the character
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newChar),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to save character: ${errorBody}`);
            }

            const savedChar = await response.json();
            setCharacters(prev => [...prev, savedChar]);
            setSelectedCharacterId(savedChar.id);

        } catch (error) {
            console.error("Full character generation failed:", error);
            alert(`An error occurred during full character generation: ${error.message}`);
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
            setCharacters(prev => prev.map(char => char.id === updatedCharacter.id ? updatedCharacter : char));
        } catch (error) {
            console.error("Failed to update character:", error);
            // Optionally revert state or notify user
        }
    }, []);

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

    const handleBackToSelector = () => { setSelectedCharacterId(null); };
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    return (
        <main>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center text-xl font-serif">Loading Heroes...</div>
            ) : !selectedCharacter ? (
                <CharacterSelector characters={characters} onSelect={handleSelectCharacter} onCreate={handleCreateCharacter} onDelete={handleDeleteCharacter} onFullGenerate={handleFullGenerateCharacter} />
            ) : (
                <CharacterSheet character={selectedCharacter} onUpdate={handleUpdateCharacter} onBack={handleBackToSelector} />
            )}
        </main>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
