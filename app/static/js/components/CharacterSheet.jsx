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
    
    // A stable, generous default layout. This prevents collapsed tiles.
    const initialLayoutConfig = {
        lg: [
            // Column 1
            { i: 'ability-scores', x: 0, y: 0, w: 1, h: 10, minH: 8, minW: 1 },
            { i: 'inspiration-prof-perc', x: 0, y: 10, w: 1, h: 5, minH: 5, minW: 1 },
            { i: 'saving-throws', x: 0, y: 15, w: 1, h: 14, minH: 10, minW: 1 },
            { i: 'character-background', x: 0, y: 29, w: 1, h: 18, minH: 15, minW: 1 },

            // Column 2
            { i: 'combat-stats', x: 1, y: 0, w: 1, h: 12, minH: 10, minW: 1 },
            { i: 'attacks', x: 1, y: 12, w: 1, h: 10, minH: 8, minW: 1 },
            { i: 'character-portrait', x: 1, y: 22, w: 1, h: 15, minH: 12, minW: 1 },
            { i: 'equipment', x: 1, y: 37, w: 1, h: 15, minH: 12, minW: 1 },

            // Column 3
            { i: 'skills', x: 2, y: 0, w: 1, h: 24, minH: 20, minW: 1 },
            { i: 'features-traits', x: 2, y: 24, w: 1, h: 20, minH: 15, minW: 1 },
            
            // Full Width Row at Bottom
            { i: 'spells', x: 0, y: 52, w: 3, h: 25, minH: 20, minW: 2 },
        ]
    };

    const [layouts, setLayouts] = useState(character.layout && Object.keys(character.layout).length > 0 ? character.layout : initialLayoutConfig);

    useEffect(() => {
        setSheetData(character);
        const hasLayout = character && character.layout && Object.keys(character.layout).length > 0;
        if (hasLayout) {
             setLayouts(character.layout);
        } else {
            setLayouts(initialLayoutConfig);
        }
    }, [character]);


    const saveLayout = async (layoutsToSave) => {
        try {
            const response = await fetch(`/api/characters/${character.id}/layout`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(layoutsToSave)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to save layout:', errorText);
                throw new Error('Failed to save layout');
            }
            if (onUpdateLayout) onUpdateLayout(character.id, layoutsToSave);
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    const debouncedSaveLayout = useCallback(debounce(saveLayout, 1000), [character.id, onUpdateLayout]);

    const handleLayoutChange = (layout, allLayouts) => {
        setLayouts(allLayouts);
        // We only need to update the layout in the sheetData for saving purposes
        setSheetData(prev => ({ ...prev, layout: allLayouts }));
        debouncedSaveLayout(allLayouts);
    };

    const handleImageUpload = async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`/api/characters/${character.id}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Image upload failed');
            }

            const data = await response.json();
            setSheetData(prev => ({ ...prev, imageUrl: data.imageUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    const handleChange = (path, value) => {
        setSheetData(prev => {
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) { current = current[keys[i]]; }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const handleAddItemToEquipment = (item) => setSheetData(prev => ({...prev, equipment: (prev.equipment || '') + `\n- ${item.name}`}));

    const handleAddSpellFromSearch = (spell) => {
        setSheetData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            const level = spell.level;
            if (level === 0) newState.spellcasting.cantrips.push({ name: spell.name, prepared: true });
            else if (level > 0 && level <= 9) newState.spellcasting.levels[level - 1].spells.push({ name: spell.name, prepared: false });
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
    const handleSave = () => onUpdate(sheetData);

    return (
        <div id="character-sheet-printable">
            <SheetHeader name={sheetData.name} className={sheetData.className} level={sheetData.level} race={sheetData.race} background={sheetData.background} alignment={sheetData.alignment} playerName={sheetData.playerName} experience={sheetData.experience} onBack={onBack} onUpdate={handleChange} onSelectAPI={(resourceType, item) => handleSelectFromAPI(resourceType, item, setSheetData)} onSave={() => { handleSave(); saveLayout(layouts); }} />
            <Responsive className="layout" layouts={layouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }} rowHeight={20} onLayoutChange={handleLayoutChange} draggableHandle=".tile-header">
                <div key="ability-scores">
                    <div className="tile-header"><span>Ability Scores</span></div>
                    <div className="tile-content"><AbilityScores scores={sheetData.abilityScores} onUpdate={handleChange} /></div>
                </div>
                <div key="inspiration-prof-perc">
                    <div className="tile-header"><span>Stats</span></div>
                    <div className="tile-content"><div className="grid grid-cols-3 gap-2 text-center"><ThemedStatBox label="Inspiration" value={sheetData.inspiration} onUpdate={(val) => handleChange('inspiration', val)} editable /><ThemedStatBox label="Prof. Bonus" value={`+${sheetData.proficiencyBonus}`} /><ThemedStatBox label="Passive Percep." value={passivePerception} /></div></div>
                </div>
                <div key="saving-throws">
                    <div className="tile-header"><span>Saving Throws</span></div>
                    <div className="tile-content"><SavingThrows savingThrows={sheetData.savingThrows} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} /></div>
                </div>
                <div key="combat-stats">
                    <div className="tile-header"><span>Combat</span></div>
                    <div className="tile-content"><CombatStats ac={sheetData.armorClass} initiative={getModifier(sheetData.abilityScores.dexterity)} speed={sheetData.speed} hp={sheetData} onUpdate={handleChange} /></div>
                </div>
                <div key="attacks">
                    <div className="tile-header"><span>Attacks</span></div>
                    <div className="tile-content"><Attacks equipment={sheetData.equipment} onUpdate={(val) => handleChange('equipment', val)} /></div>
                </div>
                <div key="character-portrait">
                    <div className="tile-header"><span>Portrait</span><MagicButton onClick={() => handleGenerate('portrait', `Fantasy character portrait, D&D style. ${sheetData.appearance || `A ${sheetData.race} ${sheetData.className} ${sheetData.level}`}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`, null, generationDeps)} isLoading={isGenerating.portrait} className="py-1 px-2 text-xs">Generate</MagicButton></div>
                    <div className="tile-content"><CharacterPortrait imageUrl={sheetData.imageUrl} onImageUpload={handleImageUpload}/></div>
                </div>
                <div key="equipment">
                    <div className="tile-header"><span>Equipment</span><SearchableSelect resourceType="equipment" onSelect={handleAddItemToEquipment} placeholder="Add Item..." /></div>
                    <div className="tile-content"><Equipment equipment={sheetData.equipment} currency={sheetData.currency} onUpdate={handleChange} /></div>
                </div>
                <div key="skills">
                    <div className="tile-header"><span>Skills</span></div>
                    <div className="tile-content"><Skills skills={sheetData.skills} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} /></div>
                </div>
                <div key="character-background">
                     <div className="tile-header"><span>Background</span><MagicButton onClick={() => handleGenerate('background', `Generate a personality trait, an ideal, a bond, and a flaw for a ${sheetData.race} ${sheetData.className} ${sheetData.level} with a "${sheetData.background}" background.`, { type: "OBJECT", properties: { personalityTraits: { type: "STRING" }, ideals: { type: "STRING" }, bonds: { type: "STRING" }, flaws: { type: "STRING" } }, required: ["personalityTraits", "ideals", "bonds", "flaws"] }, generationDeps)} isLoading={isGenerating.background} className="py-1 px-2 text-xs">Generate</MagicButton></div>
                    <div className="tile-content"><CharacterBackground data={sheetData} onUpdate={handleChange} /></div>
                </div>
                <div key="features-traits">
                    <div className="tile-header"><span>Features & Traits</span></div>
                    <div className="tile-content"><FeaturesTraits features={sheetData.features} onUpdate={(val) => handleChange('features', val)} /></div>
                </div>
                <div key="spells">
                    <div className="tile-header"><span>Spells</span><SearchableSelect resourceType="spells" onSelect={handleAddSpellFromSearch} placeholder="Add Spell..." /></div>
                    <div className="tile-content"><Spells spellcasting={sheetData.spellcasting} abilityScores={sheetData.abilityScores} proficiencyBonus={sheetData.proficiencyBonus} onUpdate={handleChange} onUpdateLevel={handleSpellcastingChange} /></div>
                </div>
            </Responsive>
        </div>
    );
};
