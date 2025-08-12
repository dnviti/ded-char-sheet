const { useState } = React;

const FullGeneratorModal = ({ isOpen, onClose, onGenerate, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="theme-dnd-card p-8 w-full max-w-lg relative border-4 border-accent-gold shadow-2xl">
                <button onClick={onClose} className="absolute top-2 right-4 text-parchment hover:text-accent-gold text-4xl font-title">&times;</button>
                <h2 className="text-3xl font-title text-center mb-4">Quick AI Creation</h2>
                <p className="text-parchment text-center mb-6">Describe your character concept (e.g., "a gruff dwarf cleric," "a book-obsessed elf wizard"). The AI will generate a complete level 1 sheet ready for an adventure.</p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g.: A half-orc barbarian with a heart of gold..."
                    className="w-full theme-dnd-input mb-4"
                    rows="3"
                />
                <button onClick={() => onGenerate(prompt)} disabled={isLoading} className="w-full theme-dnd-button text-xl py-3">
                    {isLoading ? 'Forging Hero...' : 'Create my Hero!'}
                </button>
            </div>
        </div>
    );
};

const CharacterCard = ({ char, onSelect, onDelete }) => {
    const handleSelect = () => {
        window.location.href = `/character/sheet/${char.id}`;
    };

    return (
        <div className="theme-dnd-card flex flex-col text-center p-4 transition-all duration-300 hover:scale-105 hover:border-accent-gold">
            <div className="relative">
                <img
                    src={char.imageUrl || 'https://storage.googleapis.com/proudcity/mebanenc/uploads/2021/03/placeholder-image.png'}
                    alt={`Portrait of ${char.name}`}
                    className="w-full h-60 object-cover rounded border-2 border-theme mb-4"
                />
                 <button onClick={() => onDelete(char.id)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-accent-red" aria-label="Delete character">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <h3 className="font-title text-2xl">{char.name}</h3>
            <p className="text-parchment mb-4">{char.className} | {char.race}</p>
            <button onClick={handleSelect} className="theme-dnd-button mt-auto">Load Sheet</button>
        </div>
    );
};

const CharacterSelector = ({ characters, onSelect, onCreate, onDelete, onFullGenerate }) => {
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async (prompt) => {
        setIsGenerating(true);
        await onFullGenerate(prompt);
        setIsGenerating(false);
        setIsGeneratorOpen(false);
    };

    return (
        <>
            <FullGeneratorModal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} onGenerate={handleGenerate} isLoading={isGenerating} />

            <div className="w-full">
                <div className="text-center mb-8">
                    <h2 className="text-5xl font-title mb-2">Your Heroes</h2>
                    <p className="text-parchment">Choose your character or create a new legend.</p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
                    <button onClick={onCreate} className="theme-dnd-button text-lg flex-grow">
                        + Create New Character
                    </button>
                    <button onClick={() => setIsGeneratorOpen(true)} className="theme-dnd-button text-lg flex-grow">
                        <i className="fas fa-magic mr-2"></i> Quick AI Creation
                    </button>
                </div>

                {characters.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {characters.map(char => (
                            <CharacterCard key={char.id} char={char} onSelect={onSelect} onDelete={onDelete} />
                        ))}
                    </div>
                ) : (
                     <div className="text-center bg-black/20 p-10 rounded-lg">
                        <h3 className="font-title text-3xl mb-4">The Hall of Heroes is Empty</h3>
                        <p className="text-parchment">Your adventure has not yet begun. Create your first character to get started!</p>
                    </div>
                )}
            </div>
        </>
    );
};
