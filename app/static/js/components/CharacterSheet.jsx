const { useState, useEffect, useCallback, useRef } = React;

// Main component remains the same for logic
const CharacterSheet = ({ character, onUpdate, onBack, callGeminiAPI, callImagenAPI }) => {
    const [sheetData, setSheetData] = useState(character);
    const [activeTab, setActiveTab] = useState('main');
    const [isGenerating, setIsGenerating] = useState({ appearance: false, background: false, portrait: false, hook: false });

    useEffect(() => {
        setSheetData(character);
    }, [character]);

    const handleChange = (path, value) => {
        setSheetData(prev => {
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const handleAddItemToEquipment = (item) => {
        setSheetData(prev => ({...prev, equipment: (prev.equipment || '') + `\n- ${item.name}`}));
    };

    const handleAddSpellFromSearch = (spell) => {
        setSheetData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            const level = spell.level;
            if (level === 0) {
                newState.spellcasting.cantrips.push({ name: spell.name, prepared: true });
            } else if (level > 0 && level <= 9) {
                newState.spellcasting.levels[level - 1].spells.push({ name: spell.name, prepared: false });
            }
            return newState;
        });
    };

    const handleSpellcastingChange = (levelIndex, field, value) => {
        const newLevels = [...sheetData.spellcasting.levels];
        newLevels[levelIndex][field] = value;
        handleChange('spellcasting.levels', newLevels);
    };

    const passivePerception = 10 + getModifier(sheetData.abilityScores.wisdom) + (sheetData.skills.perception.proficient ? sheetData.proficiencyBonus : 0);

    const generationDeps = { setIsGenerating, callImagenAPI, callGeminiAPI, setSheetData, handleChange };

    const handleSave = () => {
        onUpdate(sheetData);
    };

    // --- RENDER ---
    return (
        <div id="character-sheet-printable">
            {/* --- Header --- */}
            <SheetHeader
                name={sheetData.name}
                classLevel={sheetData.classLevel}
                race={sheetData.race}
                background={sheetData.background}
                alignment={sheetData.alignment}
                playerName={sheetData.playerName}
                experience={sheetData.experience}
                onBack={onBack}
                onUpdate={handleChange}
                onSelectAPI={(resourceType, item) => handleSelectFromAPI(resourceType, item, setSheetData)}
                onSave={handleSave}
            />

            {/* --- Main Content --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                {/* --- Column 1: Core Stats & Portrait --- */}
                <div className="space-y-6">
                    <AbilityScores scores={sheetData.abilityScores} onUpdate={handleChange} />
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <ThemedStatBox label="Inspiration" value={sheetData.inspiration} onUpdate={(val) => handleChange('inspiration', val)} editable />
                        <ThemedStatBox label="Prof. Bonus" value={`+${sheetData.proficiencyBonus}`} />
                        <ThemedStatBox label="Passive Percep." value={passivePerception} />
                    </div>
                    <SavingThrows savingThrows={sheetData.savingThrows} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} />
                </div>

                {/* --- Column 2: Combat & Character Info --- */}
                <div className="space-y-6">
                    <CombatStats
                        ac={sheetData.armorClass}
                        initiative={getModifier(sheetData.abilityScores.dexterity)}
                        speed={sheetData.speed}
                        hp={sheetData}
                        onUpdate={handleChange}
                    />
                    <Attacks equipment={sheetData.equipment} onUpdate={(val) => handleChange('equipment', val)} />
                    <CharacterPortrait
                        imageUrl={sheetData.imageUrl}
                        isGenerating={isGenerating.portrait}
                        onGenerate={() => handleGenerate('portrait', `Fantasy character portrait, D&D style. ${sheetData.appearance || `A ${sheetData.race} ${sheetData.classLevel}`}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`, null, generationDeps)}
                    />
                    <Equipment
                        equipment={sheetData.equipment}
                        currency={sheetData.currency}
                        onUpdate={handleChange}
                        onAddItem={handleAddItemToEquipment}
                    />
                </div>

                {/* --- Column 3: Skills & Features --- */}
                <div className="space-y-6">
                    <Skills skills={sheetData.skills} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} />
                    <CharacterBackground
                        data={sheetData}
                        isGenerating={isGenerating.background}
                        onGenerate={() => handleGenerate('background', `Generate a personality trait, an ideal, a bond, and a flaw for a ${sheetData.race} ${sheetData.classLevel} with a "${sheetData.background}" background.`, { type: "OBJECT", properties: { personalityTraits: { type: "STRING" }, ideals: { type: "STRING" }, bonds: { type: "STRING" }, flaws: { type: "STRING" } }, required: ["personalityTraits", "ideals", "bonds", "flaws"] }, generationDeps)}
                        onUpdate={handleChange}
                    />
                    <FeaturesTraits features={sheetData.features} onUpdate={(val) => handleChange('features', val)} />
                </div>
            </div>
             {/* --- Spells Section (Full Width) --- */}
            <div className="mt-6">
                <Spells
                    spellcasting={sheetData.spellcasting}
                    abilityScores={sheetData.abilityScores}
                    proficiencyBonus={sheetData.proficiencyBonus}
                    onUpdate={handleChange}
                    onAddSpell={handleAddSpellFromSearch}
                    onUpdateLevel={handleSpellcastingChange}
                />
            </div>
        </div>
    );
};
