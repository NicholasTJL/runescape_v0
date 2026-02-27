export type Skill = 'attack' | 'strength' | 'defence' | 'mining' | 'woodcutting' | 'smithing';

export interface Position {
  x: number;
  y: number;
}

export interface PlayerStats {
  hp: number;
  max_hp: number;
  xp: Record<Skill, number>;
  gold: number;
  position: Position;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  type: 'resource' | 'equipment' | 'consumable';
  icon: string;
  heal?: number;
  attackBonus?: number;
  strengthBonus?: number;
  defenceBonus?: number;
  speed?: number; // in milliseconds
}

export interface WorldEntity {
  id: string;
  type: 'tree' | 'rock' | 'npc' | 'forge' | 'bank';
  subType?: string;
  position: Position;
  name: string;
  hidden?: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  player: PlayerStats;
  inventory: InventoryItem[];
  location: string;
}
