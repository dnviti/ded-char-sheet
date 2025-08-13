async function handleRegister(email, password, setCurrentUser) {
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
    await handleLogin(email, password, setCurrentUser);
};

async function handleLogout(setCurrentUser, setSelectedCharacterId) {
    await fetch('/auth/jwt/logout', { method: 'POST' });
    setCurrentUser(null);
    setSelectedCharacterId(null);
};

async function refreshCurrentUser(setCurrentUser) {
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

async function callGeminiAPI(prompt, jsonSchema = null, refreshCurrentUser, setCurrentUser) {
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
        await refreshCurrentUser(setCurrentUser); // Refresh user data after successful generation
        return text;
    } catch (error) {
        console.error("Error calling Gemini proxy:", error);
        alert(`An error occurred while generating text: ${error.message}`);
        return null;
    }
};

async function callImagenAPI(prompt) {
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

async function handleCreateCharacter() {
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

async function handleFullGenerateCharacter(concept, onProgress, setCharacters, setSelectedCharacterId, setCurrentUser) {
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
        const generatedJson = await callGeminiAPI(prompt, schema, refreshCurrentUser, setCurrentUser);
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
        await refreshCurrentUser(setCurrentUser); // Refresh user data after character is saved
        onProgress?.("Done!");
        return savedChar;

    } catch (error) {
        console.error("Full character generation failed:", error);
        onProgress?.(`An error occurred: ${error.message}`);
        return null;
    }
};

async function handleUpdateCharacter(updatedCharacter, setCharacters) {
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
};

async function handleDeleteCharacter(id, selectedCharacterId, setSelectedCharacterId, setCharacters) {
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
