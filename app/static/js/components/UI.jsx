const ParchmentButton = ({ children, onClick, className = '', disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 bg-stone-200 hover:bg-stone-300 border border-stone-400 rounded-md text-stone-800 font-semibold shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed print:hidden ${className}`}>
        {children}
    </button>
);

const Section = ({ title, children, className = '', actions }) => (
    <div className={`relative z-0 bg-white/40 border-2 border-stone-400/50 rounded-lg p-4 shadow-inner backdrop-blur-sm print:shadow-none print:border-stone-600 print:bg-white ${className}`}>
        <div className="flex justify-between items-center mb-3 border-b-2 border-red-900/30 pb-1 print:border-b-2 print:border-stone-800">
            <h2 className="text-xl font-bold text-red-900/80 font-serif print:text-black">{title}</h2>
            {actions && <div className="flex-shrink-0 print:hidden">{actions}</div>}
        </div>
        {children}
    </div>
);

const GeminiButton = ({ onClick, isLoading, children, className = '' }) => (
    <button onClick={onClick} disabled={isLoading} className={`px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-red-500 text-white rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-wait print:hidden ${className}`}>
        <span className="flex items-center space-x-2">
            {isLoading ? ( <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <span>✨</span> )}
            <span>{children}</span>
        </span>
    </button>
);

const TabButton = ({ name, activeTab, onClick, children }) => {
    const isActive = name === activeTab;
    return (
        <button onClick={() => onClick(name)} className={`px-4 md:px-6 py-2 font-serif text-base md:text-lg transition-colors focus:outline-none whitespace-nowrap ${ isActive ? 'border-b-4 border-red-800 text-red-900' : 'text-stone-500 hover:text-red-800' }`}>
            {children}
        </button>
    );
};

const StatBox = ({ label, value, className = "" }) => (
    <div className={`flex flex-col items-center justify-center p-2 bg-stone-50/70 border-2 border-stone-400 rounded-lg shadow-md ${className}`}>
        <div className="text-2xl font-bold text-stone-800">{value}</div>
        <label className="text-xs font-bold text-stone-700 text-center">{label}</label>
    </div>
);

const EditableStatBox = ({ label, value, onChange, className = "", type = "text" }) => (
    <div className={`flex flex-col items-center justify-center p-2 bg-stone-50/70 border-2 border-stone-400 rounded-lg shadow-md ${className}`}>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full text-2xl font-bold text-stone-800 text-center bg-transparent focus:outline-none"
        />
        <label className="text-xs font-bold text-stone-700 text-center">{label}</label>
    </div>
);

const DeathSaveTracker = ({ successes, failures, onUpdate }) => {
    const handleToggle = (type, index) => {
        const currentCount = type === 'successes' ? successes : failures;
        onUpdate(type, currentCount === index + 1 ? currentCount - 1 : index + 1);
    };

    return (
        <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2">
                <span className="font-bold text-sm">Successi</span>
                {[...Array(3)].map((_, i) => (
                    <input key={`s-${i}`} type="checkbox" checked={i < successes} onChange={() => handleToggle('successes', i)} className="form-checkbox h-5 w-5 text-green-600 rounded-full"/>
                ))}
            </div>
            <div className="flex items-center space-x-2">
                <span className="font-bold text-sm">Fallimenti</span>
                {[...Array(3)].map((_, i) => (
                    <input key={`f-${i}`} type="checkbox" checked={i < failures} onChange={() => handleToggle('failures', i)} className="form-checkbox h-5 w-5 text-red-600 rounded-full"/>
                ))}
            </div>
        </div>
    );
};

const SpellLevel = ({ level, data, onUpdateCantrips, onUpdateLevel }) => {
    const [newSpell, setNewSpell] = useState('');
    const isCantrip = level === 0;
    const spells = isCantrip ? data.cantrips : data.spells;

    const handleAddSpell = () => {
        if(newSpell.trim() === '') return;
        const spellObject = { name: newSpell, prepared: isCantrip };
        const updatedSpells = [...spells, spellObject];
        if (isCantrip) {
            onUpdateCantrips(updatedSpells);
        } else {
            onUpdateLevel('spells', updatedSpells);
        }
        setNewSpell('');
    };

    const handleTogglePrepared = (index) => {
        if(isCantrip) return;
        const updatedSpells = [...spells];
        updatedSpells[index].prepared = !updatedSpells[index].prepared;
        onUpdateLevel('spells', updatedSpells);
    };

    const handleRemoveSpell = (index) => {
        const updatedSpells = spells.filter((_, i) => i !== index);
        if (isCantrip) {
            onUpdateCantrips(updatedSpells);
        } else {
            onUpdateLevel('spells', updatedSpells);
        }
    };

    return (
        <Section title={isCantrip ? "Trucchetti" : `Incantesimi di Livello ${level}`}>
            {!isCantrip && (
                <div className="flex items-center gap-4 mb-4">
                    <label className="font-bold">Slot</label>
                    <input type="number" min="0" value={data.slotsExpended} onChange={e => onUpdateLevel('slotsExpended', parseInt(e.target.value) || 0)} className="w-16 p-1 text-center border rounded"/>
                    <span>/</span>
                    <input type="number" min="0" value={data.slotsTotal} onChange={e => onUpdateLevel('slotsTotal', parseInt(e.target.value) || 0)} className="w-16 p-1 text-center border rounded"/>
                </div>
            )}
            <ul className="space-y-2">
                {spells.map((spell, index) => (
                    <li key={index} className="flex items-center gap-2">
                        {!isCantrip && <input type="checkbox" checked={spell.prepared} onChange={() => handleTogglePrepared(index)} className="form-checkbox h-5 w-5 text-red-800 rounded"/>}
                        <span className="flex-grow">{spell.name}</span>
                        <button onClick={() => handleRemoveSpell(index)} className="text-red-500 hover:text-red-800 text-xs">Rimuovi</button>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2 mt-4">
                <input type="text" value={newSpell} onChange={e => setNewSpell(e.target.value)} placeholder="Nuovo incantesimo" className="flex-grow p-1 border rounded" />
                <button onClick={handleAddSpell} className="px-3 py-1 bg-red-800 text-white rounded hover:bg-red-900">+</button>
            </div>
        </Section>
    );
};

const TextAreaInput = ({ label, value, onChange, placeholder, className = "", rows = 3, disabled = false }) => (
     <div className={`flex flex-col ${className}`}>
        <label className="text-sm font-bold text-stone-700 mb-1 print:text-black">{label}</label>
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} className="w-full bg-stone-50/70 border border-stone-300 rounded-md p-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-800/50 resize-y disabled:opacity-70 print:border-stone-500 print:bg-white print:text-black" />
    </div>
);

const AbilityScoreInput = ({ label, score, onScoreChange }) => {
    const modifier = getModifier(score);
    return (
        <div className="flex flex-col items-center justify-between p-2 bg-stone-50/70 border-2 border-stone-400 rounded-lg shadow-md h-32 print:border-2 print:border-stone-600 print:shadow-none">
            <label className="text-xs font-bold text-stone-700 print:text-black">{label.toUpperCase()}</label>
            <input type="number" value={score} onChange={e => onScoreChange(parseInt(e.target.value) || 0)} className="w-full text-4xl text-center bg-transparent text-stone-800 font-serif focus:outline-none print:text-black" />
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center border-2 border-stone-300 rounded-full bg-white text-lg font-bold text-stone-800 print:border-stone-500 print:text-black">
                {modifier >= 0 ? `+${modifier}` : modifier}
            </div>
        </div>
    );
};
