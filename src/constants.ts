import { Skill, WorldEntity } from "./types";

export const XP_TABLE = Array.from({ length: 99 }, (_, i) => {
  const level = i + 1;
  return Math.floor(0.25 * Math.floor(level + 300 * Math.pow(2, level / 7)));
});

export function getSkillInfo(xp: number) {
  let level = 1;
  let currentLevelXp = 0;
  let nextLevelTotalXp = XP_TABLE[0];

  for (let i = 0; i < XP_TABLE.length; i++) {
    if (xp >= nextLevelTotalXp) {
      level = i + 2;
      currentLevelXp = nextLevelTotalXp;
      if (i + 1 < XP_TABLE.length) {
        nextLevelTotalXp += XP_TABLE[i + 1];
      }
    } else {
      break;
    }
  }

  const xpInLevel = xp - currentLevelXp;
  const xpRequiredForNext = nextLevelTotalXp - currentLevelXp;
  const progress = level === 99 ? 100 : (xpInLevel / xpRequiredForNext) * 100;

  return {
    level: Math.min(level, 99),
    xpInLevel,
    xpRequiredForNext,
    progress,
    totalXpToNext: nextLevelTotalXp
  };
}

export const TILE_SIZE = 48;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;

export const WORLD_MAP = Array.from({ length: MAP_HEIGHT }, (_, y) => 
  Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Basic Lumbridge-like layout
    if (x < 2 || x > 17 || y < 2 || y > 17) return 1; // Water border
    if (x === 10 || y === 10) return 2; // Paths
    return 0; // Grass
  })
);

export const WORLD_ENTITIES: WorldEntity[] = [
  { id: 'oak_1', type: 'tree', subType: 'oak', position: { x: 5, y: 5 }, name: 'Oak Tree' },
  { id: 'oak_2', type: 'tree', subType: 'oak', position: { x: 6, y: 5 }, name: 'Oak Tree' },
  { id: 'oak_3', type: 'tree', subType: 'oak', position: { x: 5, y: 6 }, name: 'Oak Tree' },
  { id: 'copper_1', type: 'rock', subType: 'copper', position: { x: 15, y: 15 }, name: 'Copper Rock' },
  { id: 'copper_2', type: 'rock', subType: 'copper', position: { x: 16, y: 15 }, name: 'Copper Rock' },
  { id: 'tin_1', type: 'rock', subType: 'tin', position: { x: 14, y: 15 }, name: 'Tin Rock' },
  { id: 'tin_2', type: 'rock', subType: 'tin', position: { x: 14, y: 16 }, name: 'Tin Rock' },
  { id: 'man_1', type: 'npc', subType: 'man', position: { x: 10, y: 8 }, name: 'Man' },
  { id: 'man_2', type: 'npc', subType: 'man', position: { x: 11, y: 8 }, name: 'Man' },
  { id: 'forge_1', type: 'forge', position: { x: 5, y: 15 }, name: 'Lumbridge Forge' },
  { id: 'bank_1', type: 'bank', subType: 'bank', position: { x: 10, y: 11 }, name: 'Lumbridge Bank' },
];

export const ITEMS = {
  WOOD: { id: 'wood', name: 'Logs', type: 'resource', icon: '🌲' },
  COPPER_ORE: { id: 'copper_ore', name: 'Copper Ore', type: 'resource', icon: '🪨' },
  TIN_ORE: { id: 'tin_ore', name: 'Tin Ore', type: 'resource', icon: '🪨' },
  BRONZE_BAR: { id: 'bronze_bar', name: 'Bronze Bar', type: 'resource', icon: '🧱' },
  BRONZE_SWORD: { id: 'bronze_sword', name: 'Bronze Sword', type: 'equipment', icon: '⚔️', attackBonus: 5, strengthBonus: 4, speed: 2400 },
  BRONZE_PICKAXE: { id: 'bronze_pickaxe', name: 'Bronze Pickaxe', type: 'equipment', icon: '⛏️', attackBonus: 1, strengthBonus: 1, speed: 3000 },
  BRONZE_AXE: { id: 'bronze_axe', name: 'Bronze Axe', type: 'equipment', icon: '🪓', attackBonus: 1, strengthBonus: 1, speed: 3000 },
  SHRIMP: { id: 'shrimp', name: 'Raw Shrimp', type: 'consumable', icon: '🦐' },
  COOKED_SHRIMP: { id: 'cooked_shrimp', name: 'Cooked Shrimp', type: 'consumable', icon: '🍤' },
  BREAD: { id: 'bread', name: 'Bread', type: 'consumable', icon: '🍞' },
  HEALING_POTION: { id: 'healing_potion', name: 'Healing Potion', type: 'consumable', icon: '🧪', heal: 5 },
} as const;

export interface Location {
  id: string;
  name: string;
  description: string;
  interactions: string[];
  connections: string[];
}

export const LOCATIONS: Record<string, Location> = {
  'lumbridge_courtyard': {
    id: 'lumbridge_courtyard',
    name: 'Lumbridge Courtyard',
    description: 'The heart of Lumbridge. A few townsfolk wander about.',
    interactions: ['combat_man'],
    connections: ['lumbridge_forest', 'lumbridge_forge']
  },
  'lumbridge_forest': {
    id: 'lumbridge_forest',
    name: 'Lumbridge Forest',
    description: 'A dense forest filled with oak trees.',
    interactions: ['woodcutting_oak'],
    connections: ['lumbridge_courtyard', 'lumbridge_swamp']
  },
  'lumbridge_swamp': {
    id: 'lumbridge_swamp',
    name: 'Lumbridge Swamp',
    description: 'A murky swamp with rich mineral deposits.',
    interactions: ['mining_copper', 'mining_tin'],
    connections: ['lumbridge_forest']
  },
  'lumbridge_forge': {
    id: 'lumbridge_forge',
    name: 'Lumbridge Forge',
    description: 'A hot forge used for smelting and smithing.',
    interactions: ['smithing_smelt', 'smithing_forge'],
    connections: ['lumbridge_courtyard']
  }
};
