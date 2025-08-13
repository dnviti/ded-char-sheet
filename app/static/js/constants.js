function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const QUOTAS = {
    "free": 5,
    "premium": 20,
};

const createNewCharacter = () => ({
  id: uuidv4(),
  name: "New Hero",
  className: "Fighter",
  level: 1,
  race: "Human", background: "Acolyte", alignment: "Lawful Good",
  playerName: "", experience: 0,
  abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
  inspiration: 0, proficiencyBonus: 2,
  savingThrows: { strength: { proficient: false }, dexterity: { proficient: false }, constitution: { proficient: false }, intelligence: { proficient: false }, wisdom: { proficient: false }, charisma: { proficient: false } },
  skills: { acrobatics: { proficient: false }, animalHandling: { proficient: false }, arcana: { proficient: false }, athletics: { proficient: false }, deception: { proficient: false }, history: { proficient: false }, insight: { proficient: false }, intimidation: { proficient: false }, investigation: { proficient: false }, medicine: { proficient: false }, nature: { proficient: false }, perception: { proficient:false }, performance: { proficient: false }, persuasion: { proficient: false }, religion: { proficient: false }, sleightOfHand: { proficient: false }, stealth: { proficient: false }, survival: { proficient: false } },
  armorClass: 10, initiative: 0, speed: "30ft", maxHp: 10, currentHp: 10, tempHp: 0,
  hitDice: { total: "1d10", remaining: 1 },
  deathSaves: { successes: 0, failures: 0 },
  attacks: [{ name: "Longsword", bonus: "+3", damage: "1d8+1 slashing" }],
  equipment: "Backpack, bedroll, 10 torches...",
  currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
  personalityTraits: "", ideals: "", bonds: "", flaws: "",
  features: "Fighting Style, Second Wind",
  proficienciesAndLanguages: "Light, medium, heavy armor, shields, simple and martial weapons. Common, Elvish.",
  appearance: "", imageUrl: "", adventureHook: "",
  spellcasting: {
      ability: 'intelligence',
      cantrips: [],
      levels: Array(9).fill(null).map(() => ({
          slotsTotal: 0,
          slotsExpended: 0,
          spells: []
      }))
  }
});

const SKILL_NAMES = {
    acrobatics: { name: "Acrobatics", ability: "dexterity" }, animalHandling: { name: "Animal Handling", ability: "wisdom" },
    arcana: { name: "Arcana", ability: "intelligence" }, athletics: { name: "Athletics", ability: "strength" },
    deception: { name: "Deception", ability: "charisma" }, history: { name: "History", ability: "intelligence" },
    insight: { name: "Insight", ability: "wisdom" }, intimidation: { name: "Intimidation", ability: "charisma" },
    investigation: { name: "Investigation", ability: "intelligence" }, medicine: { name: "Medicine", ability: "wisdom" },
    nature: { name: "Nature", ability: "intelligence" }, perception: { name: "Perception", ability: "wisdom" },
    performance: { name: "Performance", ability: "charisma" }, persuasion: { name: "Persuasion", ability: "charisma" },
    religion: { name: "Religion", ability: "intelligence" }, sleightOfHand: { name: "Sleight of Hand", ability: "dexterity" },
    stealth: { name: "Stealth", ability: "dexterity" }, survival: { name: "Survival", ability: "wisdom" },
};

const SAVING_THROW_NAMES = {
    strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
    intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};

const getModifier = (score) => Math.floor((score - 10) / 2);
