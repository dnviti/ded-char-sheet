const { useState, useEffect, useCallback, useRef } = React;

// --- Components from UI.jsx ---
// ThemedSection, ThemedAbilityScore, ThemedStatBox, ThemedTextArea, MagicButton

// --- Helper Functions (assuming they are globally available or imported) ---
// getModifier, SKILL_NAMES, SAVING_THROW_NAMES

const SheetHeader = ({
    name, className, level, race, background, alignment, playerName, experience,
    onBack, onUpdate, onSelectAPI
}) => {
    return (
        <div className="bg-wood-dark p-4 rounded-lg shadow-lg border-2 border-theme mb-6 print:hidden">
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        className="text-5xl font-title bg-transparent border-b-2 border-transparent focus:border-accent-gold focus:outline-none w-full"
                        placeholder="Character Name"
                    />
                </div>
                <button onClick={onBack} className="theme-dnd-button-sm ml-4 print:hidden">&larr; Back</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3 mt-4 text-sm">
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Class</label>
                    <SearchableSelect
                        resourceType="classes"
                        value={className}
                        onSelect={(item) => onSelectAPI('classes', item)}
                        placeholder="Select Class"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Level</label>
                    <input type="number" value={level} onChange={(e) => onUpdate('level', parseInt(e.target.value) || 0)} className="theme-dnd-input" />
                </div>
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Race</label>
                     <SearchableSelect
                        resourceType="species"
                        value={race}
                        onSelect={(item) => onSelectAPI('species', item)}
                        placeholder="Select Race"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Background</label>
                    <SearchableSelect
                        resourceType="backgrounds"
                        value={background}
                        onSelect={(item) => onSelectAPI('backgrounds', item)}
                        placeholder="Select Background"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Alignment</label>
                    <input type="text" value={alignment} onChange={(e) => onUpdate('alignment', e.target.value)} className="theme-dnd-input" />
                </div>
                <div className="flex flex-col">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Player Name</label>
                    <input type="text" value={playerName} onChange={(e) => onUpdate('playerName', e.target.value)} className="theme-dnd-input" />
                </div>
                 <div className="flex flex-col md:col-span-2 lg:col-span-1">
                    <label className="font-bold text-accent-gold uppercase tracking-wider text-xs">Experience Points</label>
                    <input type="number" value={experience} onChange={(e) => onUpdate('experience', parseInt(e.target.value) || 0)} className="theme-dnd-input" />
                </div>
            </div>
        </div>
    );
};

const AbilityScores = ({ scores, onUpdate }) => {
    const handleChange = (ability, value) => {
        onUpdate(`abilityScores.${ability}`, value);
    };

    return (
        <ThemedSection title="Ability Scores">
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                {Object.entries(scores).map(([key, value]) => (
                    <ThemedAbilityScore
                        key={key}
                        label={key.substring(0, 3).toUpperCase()}
                        score={value}
                        onUpdate={(newValue) => handleChange(key, newValue)}
                    />
                ))}
            </div>
        </ThemedSection>
    );
};


const SavingThrows = ({ savingThrows, abilityScores, proficiencyBonus, onUpdate }) => {
    const handleChange = (key, proficient) => {
        onUpdate(`savingThrows.${key}.proficient`, proficient);
    };

    return (
        <ThemedSection title="Saving Throws">
            <ul className="space-y-2">
                {Object.entries(savingThrows).map(([key, { proficient }]) => {
                    const modifier = getModifier(abilityScores[key]);
                    const bonus = proficient ? modifier + proficiencyBonus : modifier;
                    return (
                        <li key={key} className="flex items-center justify-between p-2 rounded-md bg-wood-light">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={proficient}
                                    onChange={(e) => handleChange(key, e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-accent-gold bg-transparent border-parchment rounded focus:ring-accent-gold"
                                />
                                <span className="ml-3 font-bold text-sm uppercase">{SAVING_THROW_NAMES[key]}</span>
                            </div>
                            <span className="font-mono text-lg">{bonus >= 0 ? `+${bonus}` : bonus}</span>
                        </li>
                    );
                })}
            </ul>
        </ThemedSection>
    );
};

const CombatStats = ({ ac, initiative, speed, hp, onUpdate }) => {
    return (
        <ThemedSection title="Combat">
            <div className="grid grid-cols-3 gap-4 text-center">
                <ThemedStatBox label="Armor Class" value={ac} onUpdate={(val) => onUpdate('armorClass', val)} editable />
                <ThemedStatBox label="Initiative" value={initiative > 0 ? `+${initiative}`: initiative} />
                <ThemedStatBox label="Speed" value={speed} onUpdate={(val) => onUpdate('speed', val)} editable />
            </div>
            <div className="mt-4">
                 <h3 className="font-title text-lg text-accent-gold text-center mb-2">Hit Points</h3>
                 <div className="grid grid-cols-3 gap-2">
                    <ThemedStatBox label="Current HP" value={hp.currentHp} onUpdate={(val) => onUpdate('currentHp', val)} editable />
                    <ThemedStatBox label="Max HP" value={hp.maxHp} onUpdate={(val) => onUpdate('maxHp', val)} editable />
                    <ThemedStatBox label="Temp HP" value={hp.tempHp} onUpdate={(val) => onUpdate('tempHp', val)} editable />
                 </div>
            </div>
             <div className="mt-4">
                 <h3 className="font-title text-lg text-accent-gold text-center mb-2">Hit Dice & Death Saves</h3>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                    {/* Hit Dice implementation needed */}
                    {/* Death Saves implementation needed */}
                 </div>
            </div>
        </ThemedSection>
    );
};


const Attacks = ({ equipment, onUpdate }) => (
    <ThemedSection title="Attacks & Spellcasting">
        <ThemedTextArea
            label="Attacks"
            value={equipment}
            onChange={(e) => onUpdate(e.target.value)}
            rows={8}
            placeholder="Describe your attacks..."
        />
    </ThemedSection>
);

const CharacterPortrait = ({ imageUrl, isGenerating, onGenerate }) => (
    <ThemedSection title="Character Portrait" actions={<MagicButton onClick={onGenerate} isLoading={isGenerating}>Generate Portrait</MagicButton>}>
        <div className="flex items-center justify-center h-64 bg-wood-dark rounded-md overflow-hidden">
            {imageUrl ? (
                <img src={imageUrl} alt="Character Portrait" className="w-full h-full object-cover" />
            ) : (
                <div className="text-center text-parchment">
                    <p>No portrait yet.</p>
                    <p className="text-xs">Click the ✨ button to generate one!</p>
                </div>
            )}
        </div>
    </ThemedSection>
);


const Equipment = ({ equipment, currency, onUpdate, onAddItem }) => {
     const handleCurrencyChange = (key, value) => {
        onUpdate(`currency.${key}`, parseInt(value) || 0);
    };
    return (
        <ThemedSection title="Equipment" actions={<SearchableSelect resourceType="equipment" onSelect={onAddItem} placeholder="Add Item..." />}>
            <div className="grid grid-cols-5 gap-2 mb-4">
                 {Object.entries(currency).map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center">
                         <label className="text-xs font-bold text-accent-gold">{key.toUpperCase()}</label>
                         <input type="number" value={value} onChange={e => handleCurrencyChange(key, e.target.value)} className="w-full theme-dnd-input text-center" />
                    </div>
                ))}
            </div>
            <ThemedTextArea
                value={equipment}
                onChange={(e) => onUpdate('equipment', e.target.value)}
                rows={10}
                placeholder="List your equipment..."
            />
        </ThemedSection>
    );
};


const Skills = ({ skills, abilityScores, proficiencyBonus, onUpdate }) => {
    const handleChange = (key, proficient) => {
        onUpdate(`skills.${key}.proficient`, proficient);
    };

    return (
        <ThemedSection title="Skills">
            <ul className="space-y-2 text-sm">
                {Object.entries(skills).map(([key, { proficient }]) => {
                    const skillInfo = SKILL_NAMES[key];
                    const modifier = getModifier(abilityScores[skillInfo.ability]);
                    const bonus = proficient ? modifier + proficiencyBonus : modifier;
                    return (
                         <li key={key} className="flex items-center justify-between p-2 rounded-md bg-wood-light">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={proficient}
                                    onChange={(e) => handleChange(key, e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-accent-gold bg-transparent border-parchment rounded focus:ring-accent-gold"
                                />
                                <span className="ml-2 w-32 font-bold">{skillInfo.name}</span>
                                <span className="text-xs text-parchment">({skillInfo.ability.substring(0,3).toUpperCase()})</span>
                            </div>
                            <span className="font-mono text-lg">{bonus >= 0 ? `+${bonus}` : bonus}</span>
                        </li>
                    );
                })}
            </ul>
        </ThemedSection>
    );
};

const CharacterBackground = ({ data, isGenerating, onGenerate, onUpdate }) => (
    <ThemedSection title="Character Background" actions={<MagicButton onClick={onGenerate} isLoading={isGenerating}>Generate Details</MagicButton>}>
        <ThemedTextArea label="Personality Traits" value={data.personalityTraits} onChange={e => onUpdate('personalityTraits', e.target.value)} disabled={isGenerating} />
        <ThemedTextArea label="Ideals" value={data.ideals} onChange={e => onUpdate('ideals', e.target.value)} disabled={isGenerating} />
        <ThemedTextArea label="Bonds" value={data.bonds} onChange={e => onUpdate('bonds', e.target.value)} disabled={isGenerating} />
        <ThemedTextArea label="Flaws" value={data.flaws} onChange={e => onUpdate('flaws', e.target.value)} disabled={isGenerating} />
    </ThemedSection>
);

const FeaturesTraits = ({ features, onUpdate }) => (
    <ThemedSection title="Features & Traits">
        <ThemedTextArea
            value={features}
            onChange={(e) => onUpdate(e.target.value)}
            rows={15}
            placeholder="List your features and traits..."
        />
    </ThemedSection>
);

const Spells = ({ spellcasting, abilityScores, proficiencyBonus, onUpdate, onAddSpell, onUpdateLevel }) => {
    const { ability, cantrips, levels } = spellcasting;
    const spellcastingAbilityModifier = getModifier(abilityScores[ability] || 10);
    const spellSaveDC = 8 + proficiencyBonus + spellcastingAbilityModifier;
    const spellAttackBonus = proficiencyBonus + spellcastingAbilityModifier;

    return (
        <ThemedSection title="Spellcasting" actions={<SearchableSelect resourceType="spells" onSelect={onAddSpell} placeholder="Add Spell..." />}>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <ThemedStatBox label="Spellcasting Ability" value={ability.toUpperCase()} />
                <ThemedStatBox label="Spell Save DC" value={spellSaveDC} />
                <ThemedStatBox label="Spell Attack Bonus" value={`+${spellAttackBonus}`} />
            </div>

            {/* Cantrips */}
            <div>
                <h3 className="font-title text-lg text-accent-gold mb-2">Cantrips</h3>
                <ul className="space-y-1">
                    {cantrips.map((spell, index) => (
                        <li key={index} className="p-2 bg-wood-light rounded-md">{spell.name}</li>
                    ))}
                </ul>
            </div>

             {/* Leveled Spells */}
            <div className="mt-4 space-y-4">
                {levels.map((level, index) => {
                    if (level.slotsTotal === 0 && level.spells.length === 0) return null;
                    return (
                        <div key={index}>
                            <h3 className="font-title text-lg text-accent-gold mb-2">Level {index + 1}</h3>
                            <div className="flex items-center space-x-2 mb-2">
                                <span>Slots Total:</span>
                                <input type="number" value={level.slotsTotal} onChange={e => onUpdateLevel(index, 'slotsTotal', parseInt(e.target.value))} className="theme-dnd-input w-16" />
                                <span>Slots Expended:</span>
                                <input type="number" value={level.slotsExpended} onChange={e => onUpdateLevel(index, 'slotsExpended', parseInt(e.target.value))} className="theme-dnd-input w-16" />
                            </div>
                            <ul className="space-y-1">
                                {level.spells.map((spell, spellIndex) => (
                                    <li key={spellIndex} className="p-2 bg-wood-light rounded-md">{spell.name}</li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </ThemedSection>
    );
};
