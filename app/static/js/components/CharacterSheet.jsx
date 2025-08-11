const { useState, useEffect, useCallback, useRef } = React;

const CharacterSheet = ({ character, onUpdate, onBack }) => {
    const [sheetData, setSheetData] = useState(character);
    const debouncedSheetData = useDebounce(sheetData, 1000);
    const isInitialMount = useRef(true);
    const [activeTab, setActiveTab] = useState('principale');
    const [isGenerating, setIsGenerating] = useState({ appearance: false, background: false, portrait: false, hook: false });
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
                // Reset class-specific fields
                newState.hitDice = blankCharacter.hitDice;
                newState.savingThrows = blankCharacter.savingThrows;

                // Replace class name and apply new data
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
                // Replace features with new class features
                newState.features = `**Class Features for ${item.name}:**\n` + item.features?.map(f => `**${f.name}**: ${f.desc}`).join('\n\n');

            } else if (resourceType === 'species') {
                // Reset race-specific fields
                newState.speed = blankCharacter.speed;

                // Replace race name and apply new data
                newState.race = item.name;

                // Replace features with new racial traits
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
        setSheetData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            const itemText = `\n- ${item.name}`;
            newState.equipment = (newState.equipment || '') + itemText;
            return newState;
        });
    };

    const handleAddSpellFromSearch = (spell) => {
        setSheetData(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            const level = spell.level;

            if (level === 0) { // Cantrip
                newState.spellcasting.cantrips.push({ name: spell.name, prepared: true });
            } else if (level > 0 && level <= 9) {
                const levelIndex = level - 1;
                newState.spellcasting.levels[levelIndex].spells.push({ name: spell.name, prepared: false });
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
    const spellcastingAbilityMod = getModifier(sheetData.abilityScores[sheetData.spellcasting.ability] || 10);
    const calculatedSpellSaveDC = 8 + sheetData.proficiencyBonus + spellcastingAbilityMod;
    const calculatedSpellAttackBonus = sheetData.proficiencyBonus + spellcastingAbilityMod;

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
            if (!text) { throw new Error("Risposta API non valida o vuota."); }
            return text;
        } catch (error) {
            console.error("Errore chiamata API Gemini:", error);
            alert(`Si è verificato un errore durante la generazione del testo: ${error.message}`);
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
            if (!base64Data) { throw new Error("Risposta API per l'immagine non valida o vuota."); }
            return `data:image/png;base64,${base64Data}`;
        } catch (error) {
            console.error("Errore chiamata API Imagen:", error);
            alert(`Si è verificato un errore durante la generazione dell'immagine: ${error.message}`);
            return null;
        }
    };

    const handleGenerateAppearance = async () => {
        setIsGenerating(prev => ({ ...prev, appearance: true }));
        const prompt = `Sei un Dungeon Master esperto. Descrivi l'aspetto fisico di un personaggio di Dungeons & Dragons in modo vivido e conciso (massimo 2-3 frasi). Personaggio: ${sheetData.name}, un ${sheetData.race} ${sheetData.classLevel}. Evita di descrivere i vestiti, concentrati su volto, capelli, occhi e corporatura.`;
        const generatedText = await callGeminiAPI(prompt);
        if (generatedText) { handleChange('appearance', generatedText); }
        setIsGenerating(prev => ({ ...prev, appearance: false }));
    };

    const handleGenerateBackground = async () => {
        setIsGenerating(prev => ({ ...prev, background: true }));
        const prompt = `Sei un Dungeon Master esperto. Crea un background per un personaggio di Dungeons & Dragons. Personaggio: ${sheetData.name}, un ${sheetData.race} ${sheetData.classLevel} con background di "${sheetData.background}". Genera un tratto di personalità, un ideale, un legame e un difetto basati su queste informazioni.`;
        const schema = { type: "OBJECT", properties: { personalityTraits: { type: "STRING" }, ideals: { type: "STRING" }, bonds: { type: "STRING" }, flaws: { type: "STRING" } }, required: ["personalityTraits", "ideals", "bonds", "flaws"] };
        const generatedJson = await callGeminiAPI(prompt, schema);
        if (generatedJson) {
            try {
                const parsedData = JSON.parse(generatedJson);
                setSheetData(prev => ({ ...prev, ...parsedData }));
            } catch (e) {
                console.error("Errore nel parsing del JSON generato:", e);
                alert("La risposta del generatore di background non era in un formato valido.");
            }
        }
        setIsGenerating(prev => ({ ...prev, background: false }));
    };

    const handleGeneratePortrait = async () => {
        setIsGenerating(prev => ({ ...prev, portrait: true }));
        const prompt = `Fantasy character portrait, D&D style. ${sheetData.appearance || `A ${sheetData.race} ${sheetData.classLevel}`}. High quality digital painting, detailed face, fantasy art, cinematic lighting.`;
        const imageUrl = await callImagenAPI(prompt);
        if (imageUrl) { handleChange('imageUrl', imageUrl); }
        setIsGenerating(prev => ({ ...prev, portrait: false }));
    };

    const handleGenerateAdventureHook = async () => {
        setIsGenerating(prev => ({ ...prev, hook: true }));
        const prompt = `Sei un Dungeon Master. Crea un breve e intrigante spunto di avventura personalizzato (2-4 frasi) per questo personaggio di D&D:\n- Nome: ${sheetData.name}\n- Classe e Razza: ${sheetData.race} ${sheetData.classLevel}\n- Background: ${sheetData.background}\n- Ideale: ${sheetData.ideals}\n- Legame: ${sheetData.bonds}\n- Difetto: ${sheetData.flaws}\nLo spunto deve dare al giocatore un chiaro punto di partenza per un'avventura.`;
        const generatedText = await callGeminiAPI(prompt);
        if (generatedText) { handleChange('adventureHook', generatedText); }
        setIsGenerating(prev => ({ ...prev, hook: false }));
    };

    const handlePrint = () => {
        const { jsPDF } = window.jspdf;
        const sheetElement = document.getElementById('character-sheet-printable');

        window.html2canvas(sheetElement, { scale: 2, useCORS: true, windowWidth: 1440 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;

            let newWidth = pdfWidth;
            let newHeight = newWidth / ratio;

            if (newHeight > pdfHeight) {
                newHeight = pdfHeight;
                newWidth = newHeight * ratio;
            }

            const xOffset = (pdfWidth - newWidth) / 2;
            const yOffset = (pdfHeight - newHeight) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, newWidth, newHeight);
            pdf.save(`${sheetData.name.replace(/\s/g, '_')}_scheda.pdf`);
        });
    };

    const ClickableBonus = ({ children, onClick, title }) => ( <button onClick={onClick} title={title} className="w-8 text-center font-bold cursor-pointer rounded hover:bg-red-200/50 transition-colors"> {children} </button> );

    return (
        <div className="p-2 md:p-8 space-y-4">
            <div id="character-sheet-printable" className="bg-stone-100 print:bg-white p-2 md:p-4 print:p-0">
                <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 print:mb-4">
                    <div className="flex-grow">
                        <input
                            type="text"
                            value={sheetData.name}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="Character Name"
                            className="text-3xl md:text-4xl font-serif text-red-900 bg-transparent focus:outline-none focus:bg-white/20 rounded-md p-1 w-full"
                        />
                        <div className="flex items-center text-stone-600 mt-1">
                            <div className="w-1/2">
                                <SearchableSelect
                                    resourceType="classes"
                                    value={sheetData.classLevel}
                                    onSelect={(item) => handleSelectFromAPI('classes', item)}
                                    placeholder="Class & Level"
                                />
                            </div>
                            <span className="mx-2">|</span>
                            <div className="w-1/2">
                                <SearchableSelect
                                    resourceType="species"
                                    value={sheetData.race}
                                    onSelect={(item) => handleSelectFromAPI('species', item)}
                                    placeholder="Race"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-sm">
                            <div className="flex flex-col">
                                <label className="text-xs text-stone-500">Player Name</label>
                                <input type="text" value={sheetData.playerName} onChange={e => handleChange('playerName', e.target.value)} placeholder="Player Name" className="bg-transparent focus:outline-none focus:bg-white/20 rounded-md p-1" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-stone-500">Background</label>
                                <SearchableSelect
                                    resourceType="backgrounds"
                                    value={sheetData.background}
                                    onSelect={(item) => handleSelectFromAPI('backgrounds', item)}
                                    placeholder="Background"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-stone-500">Alignment</label>
                                <input type="text" value={sheetData.alignment} onChange={e => handleChange('alignment', e.target.value)} placeholder="Alignment" className="bg-transparent focus:outline-none focus:bg-white/20 rounded-md p-1" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-stone-500">Experience</label>
                                <input type="number" value={sheetData.experience} onChange={e => handleChange('experience', parseInt(e.target.value) || 0)} placeholder="XP" className="bg-transparent focus:outline-none focus:bg-white/20 rounded-md p-1" />
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-2 print:hidden self-start">
                        <ParchmentButton onClick={handlePrint}>PDF</ParchmentButton>
                        <ParchmentButton onClick={onBack}>Lista</ParchmentButton>
                    </div>
                </header>

                <div className="border-b-2 border-stone-300/80 my-4 print:hidden">
                    <div className="flex space-x-2 overflow-x-auto">
                        <TabButton name="principale" activeTab={activeTab} onClick={setActiveTab}>Principale</TabButton>
                        <TabButton name="background" activeTab={activeTab} onClick={setActiveTab}>Background & Equip.</TabButton>
                        <TabButton name="incantesimi" activeTab={activeTab} onClick={setActiveTab}>Incantesimi</TabButton>
                    </div>
                </div>

                <div className="print-container">
                    {/* Tab 1: Principale */}
                    <div className="print-col-span-2" style={{ display: activeTab === 'principale' ? 'block' : 'none' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                <Section title="Ritratto" actions={<GeminiButton onClick={handleGeneratePortrait} isLoading={isGenerating.portrait}>Genera</GeminiButton>} >
                                    <div className="w-full aspect-square bg-stone-200/50 rounded-lg flex items-center justify-center border-2 border-dashed border-stone-400/50">
                                        {isGenerating.portrait && <div className="text-stone-600">Generazione...</div>}
                                        {!isGenerating.portrait && sheetData.imageUrl && <img src={sheetData.imageUrl} alt={`Ritratto di ${sheetData.name}`} className="w-full h-full object-cover rounded-md"/>}
                                        {!isGenerating.portrait && !sheetData.imageUrl && <div className="text-center text-stone-500 p-4 print:hidden">Genera un ritratto!</div>}
                                    </div>
                                </Section>
                                <div className="grid grid-cols-3 gap-2">
                                    <EditableStatBox label="Ispirazione" value={sheetData.inspiration} onChange={e => handleChange('inspiration', parseInt(e.target.value) || 0)} type="number" />
                                    <StatBox label="Bonus Competenza" value={`+${sheetData.proficiencyBonus}`} />
                                    <StatBox label="Percezione Passiva" value={passivePerception} />
                                </div>
                                <Section title="Combattimento">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <EditableStatBox label="CA" value={sheetData.armorClass} onChange={e => handleChange('armorClass', parseInt(e.target.value) || 0)} type="number" />
                                        <StatBox label="Iniziativa" value={getModifier(sheetData.abilityScores.dexterity)} />
                                        <EditableStatBox label="Velocità" value={sheetData.speed} onChange={e => handleChange('speed', e.target.value)} />
                                    </div>
                                    <div className="mt-4"><label className="font-bold">Punti Ferita</label><input type="number" value={sheetData.currentHp} onChange={e => handleChange('currentHp', e.target.value)} className="w-full p-2 text-2xl bg-white/80 border-2 border-stone-400 rounded-md font-bold text-center" /></div>
                                    <div className="mt-2"><label className="font-bold">PF Massimi</label><input type="number" value={sheetData.maxHp} onChange={e => handleChange('maxHp', e.target.value)} className="w-full p-1 text-lg bg-stone-50/70 border border-stone-300 rounded-md" /></div>
                                    <div className="mt-2"><label className="font-bold">PF Temporanei</label><input type="number" value={sheetData.tempHp} onChange={e => handleChange('tempHp', e.target.value)} className="w-full p-1 text-lg bg-stone-50/70 border border-stone-300 rounded-md" /></div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div><label className="font-bold">Dadi Vita Totali</label><input type="text" value={sheetData.hitDice.total} onChange={e => handleChange('hitDice.total', e.target.value)} className="w-full p-1 text-center bg-stone-50/70 border rounded"/></div>
                                        <div><label className="font-bold">Dadi Vita Rim.</label><input type="number" value={sheetData.hitDice.remaining} onChange={e => handleChange('hitDice.remaining', e.target.value)} className="w-full p-1 text-center bg-stone-50/70 border rounded"/></div>
                                    </div>
                                    <DeathSaveTracker successes={sheetData.deathSaves.successes} failures={sheetData.deathSaves.failures} onUpdate={(type, value) => handleChange(`deathSaves.${type}`, value)} />
                                </Section>
                            </div>
                            <div className="lg:col-span-1 space-y-6">
                                <Section title="Caratteristiche">
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(sheetData.abilityScores).map(([key, value]) => ( <AbilityScoreInput key={key} label={SAVING_THROW_NAMES[key]} score={value} onScoreChange={(score) => handleChange(`abilityScores.${key}`, score)} /> ))}
                                    </div>
                                </Section>
                            </div>
                            <div className="lg:col-span-1 space-y-6">
                                <Section title="Tiri Salvezza">
                                    <ul className="space-y-2">
                                        {Object.entries(sheetData.savingThrows).map(([key, data]) => {
                                            const abilityMod = getModifier(sheetData.abilityScores[key]);
                                            const bonus = abilityMod + (data.proficient ? sheetData.proficiencyBonus : 0);
                                            return (<li key={key} className="flex items-center space-x-2">
                                                <input type="checkbox" checked={data.proficient} onChange={() => handleChange(`savingThrows.${key}.proficient`, !data.proficient)} className="form-checkbox h-5 w-5 text-red-800 rounded focus:ring-red-800/50" />
                                                <ClickableBonus title={`Lancia TS ${SAVING_THROW_NAMES[key]}`}>{bonus >= 0 ? `+${bonus}` : bonus}</ClickableBonus>
                                                <span className="text-stone-700">{SAVING_THROW_NAMES[key]}</span>
                                            </li>);
                                        })}
                                    </ul>
                                </Section>
                                <Section title="Abilità">
                                    <ul className="space-y-1">
                                        {Object.entries(sheetData.skills).map(([key, data]) => {
                                            const skillInfo = SKILL_NAMES[key];
                                            const abilityMod = getModifier(sheetData.abilityScores[skillInfo.ability]);
                                            const bonus = abilityMod + (data.proficient ? sheetData.proficiencyBonus : 0);
                                            return (<li key={key} className="flex items-center space-x-2">
                                                <input type="checkbox" checked={data.proficient} onChange={() => handleChange(`skills.${key}.proficient`, !data.proficient)} className="form-checkbox h-5 w-5 text-red-800 rounded focus:ring-red-800/50"/>
                                                <ClickableBonus title={`Lancia ${skillInfo.name}`}>{bonus >= 0 ? `+${bonus}` : bonus}</ClickableBonus>
                                                <span className="text-stone-700 text-sm">{skillInfo.name} <span className="text-xs text-stone-500">({skillInfo.ability.slice(0,3).toUpperCase()})</span></span>
                                            </li>);
                                        })}
                                    </ul>
                                </Section>
                            </div>
                        </div>
                    </div>
                    {/* Tab 2: Background & Equipaggiamento */}
                    <div className="print-col-span-2" style={{ display: activeTab === 'background' ? 'block' : 'none' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <Section title="Personalità" actions={<GeminiButton onClick={handleGenerateBackground} isLoading={isGenerating.background}>Genera</GeminiButton>} >
                                    <TextAreaInput label="Aspetto" value={sheetData.appearance} onChange={e => handleChange('appearance', e.target.value)} rows={3} disabled={isGenerating.appearance}/>
                                    <TextAreaInput label="Tratti di Personalità" value={sheetData.personalityTraits} onChange={e => handleChange('personalityTraits', e.target.value)} rows={2} disabled={isGenerating.background} className="mt-2"/>
                                    <TextAreaInput label="Ideali" value={sheetData.ideals} onChange={e => handleChange('ideals', e.target.value)} className="mt-2" rows={2} disabled={isGenerating.background} />
                                    <TextAreaInput label="Legami" value={sheetData.bonds} onChange={e => handleChange('bonds', e.target.value)} className="mt-2" rows={2} disabled={isGenerating.background} />
                                    <TextAreaInput label="Difetti" value={sheetData.flaws} onChange={e => handleChange('flaws', e.target.value)} className="mt-2" rows={2} disabled={isGenerating.background} />
                                </Section>
                                <Section title="Spunto di Avventura" actions={<GeminiButton onClick={handleGenerateAdventureHook} isLoading={isGenerating.hook}>Genera</GeminiButton>} >
                                    <TextAreaInput label="" value={sheetData.adventureHook} onChange={e => handleChange('adventureHook', e.target.value)} rows={4} disabled={isGenerating.hook} placeholder="Crea uno spunto di avventura... ✨"/>
                                </Section>
                            </div>
                            <div className="space-y-6">
                                <Section title="Equipaggiamento & Valuta">
                                    <div className="grid grid-cols-5 gap-2 mb-4">
                                        {Object.keys(sheetData.currency).map(key => (
                                            <div key={key}><label className="block text-center font-bold text-sm">{key.toUpperCase()}</label><input type="number" value={sheetData.currency[key]} onChange={e => handleChange(`currency.${key}`, e.target.value)} className="w-full p-1 text-center border rounded"/></div>
                                        ))}
                                    </div>
                                    <TextAreaInput label="" value={sheetData.equipment} onChange={e => handleChange('equipment', e.target.value)} rows={10} />
                                    <div className="mt-4 space-y-2 print:hidden">
                                        <div>
                                            <label className="font-bold text-sm">Add Item:</label>
                                            <SearchableSelect
                                                resourceType="items"
                                                value=""
                                                onSelect={(item) => handleAddItemToEquipment(item)}
                                                placeholder="Search for an item..."
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-sm">Add Weapon:</label>
                                            <SearchableSelect
                                                resourceType="weapons"
                                                value=""
                                                onSelect={(item) => handleAddItemToEquipment(item)}
                                                placeholder="Search for a weapon..."
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-sm">Add Armor:</label>
                                            <SearchableSelect
                                                resourceType="armor"
                                                value=""
                                                onSelect={(item) => handleAddItemToEquipment(item)}
                                                placeholder="Search for an armor..."
                                            />
                                        </div>
                                    </div>
                                </Section>
                                <Section title="Privilegi & Tratti">
                                    <TextAreaInput label="" value={sheetData.features} onChange={e => handleChange('features', e.target.value)} rows={10} />
                                </Section>
                                <Section title="Altre Competenze & Linguaggi">
                                    <TextAreaInput label="" value={sheetData.proficienciesAndLanguages} onChange={e => handleChange('proficienciesAndLanguages', e.target.value)} rows={6} />
                                </Section>
                            </div>
                        </div>
                    </div>
                    {/* Tab 3: Incantesimi */}
                    <div className="print-col-span-2" style={{ display: activeTab === 'incantesimi' ? 'block' : 'none' }}>
                        <Section title="Capacità da Incantatore">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-sm font-bold">Caratteristica</label>
                                    <select value={sheetData.spellcasting.ability} onChange={e => handleChange('spellcasting.ability', e.target.value)} className="p-2 border rounded">
                                        <option value="intelligence">Intelligenza</option>
                                        <option value="wisdom">Saggezza</option>
                                        <option value="charisma">Carisma</option>
                                    </select>
                                </div>
                                <StatBox label="CD Tiro Salvezza" value={calculatedSpellSaveDC} />
                                <StatBox label="Bonus Attacco Inc." value={`+${calculatedSpellAttackBonus}`} />
                            </div>
                            <div className="mt-4 print:hidden">
                                <label className="font-bold text-sm">Add Spell:</label>
                                <SearchableSelect
                                    resourceType="spells"
                                    value=""
                                    onSelect={handleAddSpellFromSearch}
                                    placeholder="Search for a spell..."
                                />
                            </div>
                        </Section>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <SpellLevel level={0} data={sheetData.spellcasting} onUpdateCantrips={(value) => handleChange('spellcasting.cantrips', value)} />
                            {sheetData.spellcasting.levels.map((levelData, index) => (
                                <SpellLevel key={index+1} level={index+1} data={levelData} onUpdateLevel={(field, value) => handleSpellcastingChange(index, field, value)} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
