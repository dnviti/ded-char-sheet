const { useState, useEffect, useCallback, useRef } = React;

// Main component remains the same for logic
const CharacterSheet = ({ character, onUpdate, onBack, callGeminiAPI, callImagenAPI }) => {
    const [sheetData, setSheetData] = useState(character);
    const debouncedSheetData = useDebounce(sheetData, 1000);
    const isInitialMount = useRef(true);
    const [activeTab, setActiveTab] = useState('main');
    const [isGenerating, setIsGenerating] = useState({ appearance: false, background: false, portrait: false, hook: false });

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        onUpdate(debouncedSheetData);
    }, [debouncedSheetData, onUpdate]);

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

    const handleSelectFromAPI = (resourceType, item) => {
        setSheetData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            const blankCharacter = createNewCharacter();

            if (resourceType === 'classes') {
                newState.hitDice = blankCharacter.hitDice;
                newState.savingThrows = blankCharacter.savingThrows;
                newState.classLevel = item.name;
                if (item.hit_dice) {
                    newState.hitDice.total = `1${item.hit_dice.toLowerCase()}`;
                }
                if (item.saving_throws) {
                    item.saving_throws.forEach(st => {
                        const key = st.name.toLowerCase();
                        if (newState.savingThrows[key]) {
                            newState.savingThrows[key].proficient = true;
                        }
                    });
                }
                newState.features = `**Class Features for ${item.name}:**\n` + item.features?.map(f => `**${f.name}**: ${f.desc}`).join('\n\n');

            } else if (resourceType === 'species') {
                newState.speed = blankCharacter.speed;
                newState.race = item.name;
                newState.features = `**Racial Traits for ${item.name}:**\n` + item.traits?.map(t => `**${t.name}**: ${t.desc}`).join('\n\n');

            } else if (resourceType === 'backgrounds') {
                newState.background = item.name;
                if (item.benefits) {
                    let background_features = [];
                    item.benefits.forEach(benefit => {
                        if (benefit.type === 'skill_proficiency' && benefit.desc) {
                            const skillNames = benefit.desc.match(/([A-Z][a-z]+(\s[A-Z][a-z]+)*)/g);
                            if (skillNames) {
                                skillNames.forEach(skillName => {
                                    const skillKey = Object.keys(SKILL_NAMES).find(key => SKILL_NAMES[key].name.toLowerCase() === skillName.toLowerCase());
                                    if (skillKey && newState.skills[skillKey]) {
                                        newState.skills[skillKey].proficient = true;
                                    }
                                });
                            }
                        } else if (benefit.type === 'language' && benefit.desc) {
                            newState.proficienciesAndLanguages = (newState.proficienciesAndLanguages ? newState.proficienciesAndLanguages + '\n' : '') + `Background: ${benefit.desc}`;
                        } else if (benefit.type === 'equipment' && benefit.desc) {
                             newState.equipment = (newState.equipment ? newState.equipment + '\n' : '') + `Background Equipment: ${benefit.desc}`;
                        } else {
                            background_features.push(`**${benefit.name}**: ${benefit.desc}`);
                        }
                    });
                    if(background_features.length > 0) {
                        newState.features = (newState.features ? newState.features + '\n\n' : '') + `**Background Features for ${item.name}:**\n` + background_features.join('\n');
                    }
                }
            }
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

    const handleGenerate = async (type, prompt, schema = null) => {
        setIsGenerating(prev => ({ ...prev, [type]: true }));
        let result = null;
        if (type === 'portrait') {
            result = await callImagenAPI(prompt);
            if(result) handleChange('imageUrl', result);
        } else {
            result = await callGeminiAPI(prompt, schema);
            if (!result) {
                setIsGenerating(prev => ({ ...prev, [type]: false }));
                return;
            }
            if (type === 'background') {
                try {
                    const parsedData = JSON.parse(result);
                    setSheetData(prev => ({ ...prev, ...parsedData }));
                } catch (e) {
                    console.error("Error parsing generated JSON:", e);
                    alert("The response from the background generator was not valid.");
                }
            } else {
                handleChange(type, result);
            }
        }
        setIsGenerating(prev => ({ ...prev, [type]: false }));
    };

    const passivePerception = 10 + getModifier(sheetData.abilityScores.wisdom) + (sheetData.skills.perception.proficient ? sheetData.proficiencyBonus : 0);

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
                onSelectAPI={handleSelectFromAPI}
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
                        onGenerate={() => handleGenerate('portrait', `Fantasy character portrait, D&D style. ${sheetData.appearance || `A ${sheetData.race} ${sheetData.classLevel}`}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`)}
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
                        onGenerate={() => handleGenerate('background', `Generate a personality trait, an ideal, a bond, and a flaw for a ${sheetData.race} ${sheetData.classLevel} with a "${sheetData.background}" background.`, { type: "OBJECT", properties: { personalityTraits: { type: "STRING" }, ideals: { type: "STRING" }, bonds: { type: "STRING" }, flaws: { type: "STRING" } }, required: ["personalityTraits", "ideals", "bonds", "flaws"] })}
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
