const ThemedButton = ({ children, onClick, className = '', disabled = false, variant = 'primary' }) => {
    const baseClasses = "theme-dnd-button";
    const variantClasses = {
        primary: "bg-accent-red text-white border-accent-gold",
        secondary: "bg-wood-light text-parchment border-theme",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const MagicButton = ({ onClick, isLoading, children, className = '' }) => (
    <ThemedButton onClick={onClick} disabled={isLoading} className={`bg-purple-700 border-purple-400 hover:bg-purple-500 ${className}`}>
        <span className="flex items-center justify-center space-x-2">
            {isLoading ? ( <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <span>✨</span> )}
            <span>{children}</span>
        </span>
    </ThemedButton>
);

const ThemedTabButton = ({ name, activeTab, onClick, children }) => {
    const isActive = name === activeTab;
    return (
        <button
            onClick={() => onClick(name)}
            className={`px-6 py-2 font-title text-xl transition-colors focus:outline-none whitespace-nowrap border-b-4 ${
                isActive ? 'border-accent-gold text-accent-gold' : 'border-transparent text-parchment hover:text-accent-gold'
            }`}
        >
            {children}
        </button>
    );
};

const ThemedStatBox = ({ label, value, onUpdate, className = "", editable = false }) => (
    <div className={`theme-dnd-card items-center justify-center p-2 bg-wood-light border-2 border-theme ${className}`}>
        {editable ? (
            <input
                type="number"
                value={value}
                onChange={e => onUpdate(parseInt(e.target.value) || 0)}
                className="w-full text-3xl font-title text-center bg-transparent focus:outline-none text-white"
            />
        ) : (
            <div className="text-3xl font-title text-white">{value}</div>
        )}
        <label className="text-xs font-bold text-accent-gold text-center uppercase tracking-wider">{label}</label>
    </div>
);

const ThemedTextBox = ({ label, value, onUpdate, className = "", editable = false }) => (
    <div className={`theme-dnd-card items-center justify-center p-2 bg-wood-light border-2 border-theme ${className}`}>
        {editable ? (
            <input
                type="text"
                value={value}
                onChange={e => onUpdate(e.target.value || "")}
                className="w-full text-3xl font-title text-center bg-transparent focus:outline-none text-white"
            />
        ) : (
            <div className="text-3xl font-title text-white">{value}</div>
        )}
        <label className="text-xs font-bold text-accent-gold text-center uppercase tracking-wider">{label}</label>
    </div>
);

const ThemedTextArea = ({ label, value, onChange, placeholder, className = "", rows = 3, disabled = false }) => (
     <div className={`flex flex-col ${className}`}>
        {label && <label className="text-sm font-title text-accent-gold mb-1">{label}</label>}
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="w-full theme-dnd-input resize-y disabled:opacity-70"
        />
    </div>
);

const ThemedAbilityScore = ({ label, score, onUpdate }) => {
    const modifier = getModifier(score);
    return (
        <div className="theme-dnd-card flex flex-col items-center p-2 h-32 border-2 border-theme">
            <label className="font-title text-sm text-accent-gold">{label.toUpperCase()}</label>
            <input
                type="number"
                value={score}
                onChange={e => onUpdate(parseInt(e.target.value) || 0)}
                className="w-full text-4xl text-center bg-transparent font-serif focus:outline-none text-white"
            />
            <div className="w-10 h-10 flex items-center justify-center border-2 border-border-color rounded-full bg-parchment text-lg font-bold text-wood-dark">
                {modifier >= 0 ? `+${modifier}` : modifier}
            </div>
        </div>
    );
};
