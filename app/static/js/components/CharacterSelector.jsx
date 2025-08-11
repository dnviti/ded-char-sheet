const { useState } = React;

const FullGeneratorModal = ({ isOpen, onClose, onGenerate, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-100 p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 text-2xl">&times;</button>
                <h2 className="text-2xl font-serif text-red-900 mb-4">Quick Creation with AI</h2>
                <p className="text-stone-600 mb-6">Describe your character concept (e.g., "gruff dwarf cleric," "book-obsessed elf wizard"). The AI will generate a complete level 1 sheet ready to play.</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="E.g.: Half-orc barbarian with a heart of gold..." className="w-full p-2 border border-stone-300 rounded-md mb-4" rows="3" />
                <GeminiButton onClick={() => onGenerate(prompt)} isLoading={isLoading} className="w-full py-3 text-base">
                    {isLoading ? 'Generating...' : 'Create my Hero!'}
                </GeminiButton>
            </div>
        </div>
    );
};

const CharacterSelector = ({ characters, onSelect, onCreate, onDelete, onFullGenerate }) => {
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async (prompt) => {
        setIsGenerating(true);
        // This now just shows an alert, as the logic needs to be fully re-implemented
        // to connect to the backend after generation.
        await onFullGenerate(prompt);
        setIsGenerating(false);
        // setIsGeneratorOpen(false); // Keep open to show it's not implemented
    };

    return (
        <>
            <FullGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} onGenerate={handleGenerate} isLoading={isGenerating} />
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white/60 border-4 border-stone-400/50 rounded-lg p-6 md:p-8 shadow-2xl backdrop-blur-md">
                    <h1 className="text-3xl md:text-4xl font-serif text-center text-red-900 mb-2">Your Heroes</h1>
                    <p className="text-center text-stone-600 mb-8">Choose a character, create one from scratch, or use the AI for an instant adventure.</p>
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <ParchmentButton onClick={onCreate} className="w-full bg-red-800/80 hover:bg-red-700/80 text-white font-bold py-3 px-6 text-lg">
                            + Create Character
                        </ParchmentButton>
                        <GeminiButton onClick={() => setIsGeneratorOpen(true)} isLoading={isGenerating} className="w-full py-3 text-base">
                            Quick AI Creation
                        </GeminiButton>
                    </div>
                    <div className="space-y-4">
                        {characters.length > 0 ? (
                            characters.map(char => (
                                <div key={char.id} className="flex items-center justify-between bg-stone-50/80 p-4 rounded-lg border border-stone-300 shadow-sm">
                                    <div className="flex items-center space-x-4 overflow-hidden">
                                        {char.imageUrl ? <img src={char.imageUrl} alt={char.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0"/> : <div className="w-12 h-12 rounded-full bg-stone-300 flex-shrink-0"/>}
                                        <div className="overflow-hidden">
                                            <h2 className="font-bold text-lg text-stone-800 truncate">{char.name}</h2>
                                            <p className="text-sm text-stone-600 truncate">{char.classLevel} | {char.race}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0">
                                        <ParchmentButton onClick={() => onSelect(char.id)}>Load</ParchmentButton>
                                        <button onClick={() => onDelete(char.id)} className="p-2 text-stone-500 hover:text-red-700 transition-colors" aria-label="Delete character">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : ( <p className="text-center text-stone-500 italic py-8">No saved characters. It's time to start an adventure!</p> )}
                    </div>
                </div>
            </div>
        </>
    );
};
