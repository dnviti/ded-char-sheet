const { useState, useEffect } = React;

// Custom hook for debouncing a value
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Note: The following functions are designed to be used within the CharacterSheet component's context.
// They expect to receive `setSheetData`, `callGeminiAPI`, `callImagenAPI`, and `createNewCharacter` as arguments.

const handleSelectFromAPI = (resourceType, item, setSheetData) => {
    setSheetData(prev => {
        const newState = JSON.parse(JSON.stringify(prev));
        const blankCharacter = createNewCharacter(); // Assumes createNewCharacter is in scope

        if (resourceType === 'classes') {
            newState.hitDice = blankCharacter.hitDice;
            newState.savingThrows = blankCharacter.savingThrows;
            newState.className = item.name;
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
            newState.features = (newState.features ? newState.features + '\n\n' : '') + `**Class Features for ${item.name}:**\n` + item.features?.map(f => `**${f.name}**: ${f.desc}`).join('\n\n');

        } else if (resourceType === 'species') {
            newState.speed = item.speed ? `${item.speed}ft` : '30ft';
            newState.race = item.name;
            newState.features = (newState.features ? newState.features + '\n\n' : '') + `**Racial Traits for ${item.name}:**\n` + item.traits?.map(t => `**${t.name}**: ${t.desc}`).join('\n\n');

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

const handleGenerate = async (type, prompt, schema, { setIsGenerating, callImagenAPI, callGeminiAPI, setSheetData, handleChange }) => {
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
