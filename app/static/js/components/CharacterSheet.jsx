const { useState, useEffect, useCallback, useRef } = React;
const ResponsiveGridLayout = ReactGridLayout.Responsive;
const WidthProvider = ReactGridLayout.WidthProvider;
const Responsive = WidthProvider(ResponsiveGridLayout);

const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

// Main component remains the same for logic
const CharacterSheet = ({ character, onUpdate, onBack, callGeminiAPI, callImagenAPI, onUpdateLayout }) => {
    const [sheetData, setSheetData] = useState(character);
    const [isGenerating, setIsGenerating] = useState({ appearance: false, background: false, portrait: false, hook: false });
    const [layouts, setLayouts] = useState(character.layout || {});

    useEffect(() => {
        setSheetData(character);
        setLayouts(character.layout || {});
    }, [character]);

    const saveLayout = async (layoutsToSave) => {
        try {
            const response = await fetch(`/api/characters/${character.id}/layout`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(layoutsToSave)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to save layout:', errorText);
                throw new Error('Failed to save layout');
            }
            // Update parent state
            if (onUpdateLayout) {
                onUpdateLayout(character.id, layoutsToSave);
            }
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    const debouncedSaveLayout = useCallback(debounce(saveLayout, 1000), [character.id, onUpdateLayout]);

    const handleLayoutChange = (layout, allLayouts) => {
        setLayouts(allLayouts);
        setSheetData(prev => ({ ...prev, layout: allLayouts }));
        debouncedSaveLayout(allLayouts);
    };

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

    const initialLayout = [
        { i: 'ability-scores', x: 0, y: 0, w: 1, h: 2 },
        { i: 'inspiration-prof-perc', x: 0, y: 2, w: 1, h: 1 },
        { i: 'saving-throws', x: 0, y: 3, w: 1, h: 2 },
        { i: 'combat-stats', x: 1, y: 0, w: 1, h: 2 },
        { i: 'attacks', x: 1, y: 2, w: 1, h: 1 },
        { i: 'character-portrait', x: 1, y: 3, w: 1, h: 2 },
        { i: 'equipment', x: 1, y: 5, w: 1, h: 2 },
        { i: 'skills', x: 2, y: 0, w: 1, h: 3 },
        { i: 'character-background', x: 2, y: 3, w: 1, h: 2 },
        { i: 'features-traits', x: 2, y: 5, w: 1, h: 2 },
        { i: 'spells', x: 0, y: 7, w: 3, h: 3 },
    ];

    // --- RENDER ---
    return (
        <div id="character-sheet-printable">
            {/* --- Header --- */}
            <SheetHeader
                name={sheetData.name}
                className={sheetData.className}
                level={sheetData.level}
                race={sheetData.race}
                background={sheetData.background}
                alignment={sheetData.alignment}
                playerName={sheetData.playerName}
                experience={sheetData.experience}
                onBack={onBack}
                onUpdate={handleChange}
                onSelectAPI={(resourceType, item) => handleSelectFromAPI(resourceType, item, setSheetData)}
                onSave={() => {
                    handleSave();
                    saveLayout(layouts);
                }}
            />

            {/* --- Main Content --- */}
            <Responsive
                className="layout"
                layouts={Object.keys(layouts).length > 0 ? layouts : { lg: initialLayout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
                rowHeight={100}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".tile-header"
            >
                <div key="ability-scores">
                    <div className="tile-header">Ability Scores</div>
                    <AbilityScores scores={sheetData.abilityScores} onUpdate={handleChange} />
                </div>
                <div key="inspiration-prof-perc">
                    <div className="tile-header">Stats</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <ThemedStatBox label="Inspiration" value={sheetData.inspiration} onUpdate={(val) => handleChange('inspiration', val)} editable />
                        <ThemedStatBox label="Prof. Bonus" value={`+${sheetData.proficiencyBonus}`} />
                        <ThemedStatBox label="Passive Percep." value={passivePerception} />
                    </div>
                </div>
                <div key="saving-throws">
                    <div className="tile-header">Saving Throws</div>
                    <SavingThrows savingThrows={sheetData.savingThrows} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} />
                </div>
                <div key="combat-stats">
                    <div className="tile-header">Combat</div>
                    <CombatStats
                        ac={sheetData.armorClass}
                        initiative={getModifier(sheetData.abilityScores.dexterity)}
                        speed={sheetData.speed}
                        hp={sheetData}
                        onUpdate={handleChange}
                    />
                </div>
                <div key="attacks">
                    <div className="tile-header">Attacks</div>
                    <Attacks equipment={sheetData.equipment} onUpdate={(val) => handleChange('equipment', val)} />
                </div>
                <div key="character-portrait">
                    <div className="tile-header">Portrait</div>
                    <CharacterPortrait
                        imageUrl={sheetData.imageUrl}
                        isGenerating={isGenerating.portrait}
                        onGenerate={() => handleGenerate('portrait', `Fantasy character portrait, D&D style. ${sheetData.appearance || `A ${sheetData.race} ${sheetData.className} ${sheetData.level}`}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`, null, generationDeps)}
                    />
                </div>
                <div key="equipment">
                    <div className="tile-header">Equipment</div>
                    <Equipment
                        equipment={sheetData.equipment}
                        currency={sheetData.currency}
                        onUpdate={handleChange}
                        onAddItem={handleAddItemToEquipment}
                    />
                </div>
                <div key="skills">
                    <div className="tile-header">Skills</div>
                    <Skills skills={sheetData.skills} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} />
                </div>
                <div key="character-background">
                    <div className="tile-header">Background</div>
                    <CharacterBackground
                        data={sheetData}
                        isGenerating={isGenerating.background}
                        onGenerate={() => handleGenerate('background', `Generate a personality trait, an ideal, a bond, and a flaw for a ${sheetData.race} ${sheetData.className} ${sheetData.level} with a "${sheetData.background}" background.`, { type: "OBJECT", properties: { personalityTraits: { type: "STRING" }, ideals: { type: "STRING" }, bonds: { type: "STRING" }, flaws: { type: "STRING" } }, required: ["personalityTraits", "ideals", "bonds", "flaws"] }, generationDeps)}
                        onUpdate={handleChange}
                    />
                </div>
                <div key="features-traits">
                    <div className="tile-header">Features & Traits</div>
                    <FeaturesTraits features={sheetData.features} onUpdate={(val) => handleChange('features', val)} />
                </div>
                <div key="spells">
                    <div className="tile-header">Spells</div>
                    <Spells
                        spellcasting={sheetData.spellcasting}
                        abilityScores={sheetData.abilityScores}
                        proficiencyBonus={sheetData.proficiencyBonus}
                        onUpdate={handleChange}
                        onAddSpell={handleAddSpellFromSearch}
                        onUpdateLevel={handleSpellcastingChange}
                    />
                </div>
            </Responsive>
        </div>
    );
};
