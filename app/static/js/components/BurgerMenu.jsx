const { useState, useEffect, useRef } = React;

function BurgerMenu({ currentUser, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div ref={menuRef}>
            {/* Burger Icon */}
            <button
                onClick={toggleMenu}
                className="fixed top-4 left-4 z-50 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="primary-navigation"
                aria-expanded={isOpen}
            >
                <span className="sr-only">Menu</span>
                <div className="flex flex-col items-center justify-center w-8 h-8">
                    <span className={`block w-7 h-0.5 bg-white transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                    <span className={`block w-7 h-0.5 bg-white my-1.5 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-7 h-0.5 bg-white transition-transform duration-300 ease-in-out ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </div>
            </button>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleMenu}
            ></div>

            {/* Menu Panel */}
            <div
                id="primary-navigation"
                className={`fixed top-0 left-0 h-full w-64 bg-wood-dark shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full pt-16">
                    {/* Header */}
                    <div className="p-4 border-b-2 border-theme-light">
                        <p className="font-bold text-xl text-parchment">{currentUser.email}</p>
                        <p className="text-sm text-parchment-light capitalize">{currentUser.package} User</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-grow py-4">
                         <p className="px-4 py-2 text-gray-500 text-sm">Coming Soon</p>
                        <a href="#" className="block px-4 py-3 text-parchment opacity-50 cursor-not-allowed">Dice Roller</a>
                        <a href="#" className="block px-4 py-3 text-parchment opacity-50 cursor-not-allowed">Condition Tracking</a>
                    </nav>

                    {/* Footer */}
                    <div className="border-t-2 border-theme-light">
                        <button
                            onClick={() => { onLogout(); setIsOpen(false); }}
                            className="block w-full text-left px-4 py-4 text-parchment hover:bg-theme focus:outline-none focus:bg-theme-dark"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
