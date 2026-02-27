import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerStats, InventoryItem, Skill, ChatMessage, WorldEntity } from '../types';
import { ITEMS, getSkillInfo, WORLD_MAP, WORLD_ENTITIES, MAP_WIDTH, MAP_HEIGHT } from '../constants';

export function useGameEngine() {
  const [stats, setStats] = useState<PlayerStats>({
    hp: 10,
    max_hp: 10,
    xp: {
      attack: 0,
      strength: 0,
      defence: 0,
      mining: 0,
      woodcutting: 0,
      smithing: 0
    },
    gold: 0,
    position: { x: 10, y: 10 }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [entities, setEntities] = useState<WorldEntity[]>(WORLD_ENTITIES);
  const [activeAction, setActiveAction] = useState<{ type: string, progress: number } | null>(null);
  const [combatTarget, setCombatTarget] = useState<{ name: string, hp: number, max_hp: number } | null>(null);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('lumbridge_courtyard');
  const [logs, setLogs] = useState<string[]>(["Welcome to RuneQuest!"]);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastHit, setLastHit] = useState<{ type: 'player' | 'enemy', damage: number, timestamp: number } | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/player/Adventurer');
        const data = await res.json();
        if (data.player) {
          setCurrentLocation(data.player.location || 'lumbridge_courtyard');
          setStats({
            hp: data.player.hp,
            max_hp: data.player.max_hp,
            gold: data.player.gold,
            position: { x: data.player.pos_x || 10, y: data.player.pos_y || 10 },
            xp: {
              attack: data.player.xp_attack,
              strength: data.player.xp_strength,
              defence: data.player.xp_defence,
              mining: data.player.xp_mining,
              woodcutting: data.player.xp_woodcutting,
              smithing: data.player.xp_smithing
            }
          });
          
          if (data.inventory) {
            const mappedInventory = data.inventory.map((item: any) => {
              const template = Object.values(ITEMS).find(i => i.id === item.item_id);
              if (!template) return null;
              return { ...template, quantity: item.quantity } as InventoryItem;
            }).filter((i: any): i is InventoryItem => i !== null);
            setInventory(mappedInventory);
          }
        }
      } catch (e) {
        console.error("Failed to load player data", e);
      }
    };
    loadData();
  }, []);

  // Chat logic
  const fetchChat = useCallback(async () => {
    try {
      const response = await fetch('/api/chat');
      if (!response.ok) return;
      const data = await response.json();
      setChatMessages(data.map((m: any) => ({
        id: m.id.toString(),
        user: m.username,
        message: m.message,
        timestamp: new Date(m.timestamp).getTime()
      })).reverse());
    } catch (error) {
      console.error("Failed to fetch chat:", error);
    }
  }, []);

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Adventurer', message })
      });
      fetchChat();
    } catch (error) {
      console.error("Failed to send chat:", error);
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [fetchChat]);

  const statsRef = useRef(stats);
  const inventoryRef = useRef(inventory);
  const locationRef = useRef(currentLocation);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    locationRef.current = currentLocation;
  }, [currentLocation]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsSaving(true);
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Adventurer',
            stats: {
              hp: statsRef.current.hp,
              max_hp: statsRef.current.max_hp,
              gold: statsRef.current.gold,
              location: locationRef.current,
              pos_x: statsRef.current.position.x,
              pos_y: statsRef.current.position.y,
              xp_attack: statsRef.current.xp.attack,
              xp_strength: statsRef.current.xp.strength,
              xp_defence: statsRef.current.xp.defence,
              xp_mining: statsRef.current.xp.mining,
              xp_woodcutting: statsRef.current.xp.woodcutting,
              xp_smithing: statsRef.current.xp.smithing
            },
            inventory: inventoryRef.current.map(i => ({ item_id: i.id, quantity: i.quantity }))
          })
        });
        if (!res.ok) throw new Error("Save failed");
      } catch (e) {
        console.error("Failed to save", e);
      } finally {
        setIsSaving(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const addXp = (skill: Skill, amount: number) => {
    setStats(prev => {
      const newXp = prev.xp[skill] + amount;
      const oldLevel = getSkillInfo(prev.xp[skill]).level;
      const newLevel = getSkillInfo(newXp).level;
      
      if (newLevel > oldLevel) {
        addLog(`Congratulations! You just advanced your ${skill} level to ${newLevel}.`);
      }
      
      return {
        ...prev,
        xp: { ...prev.xp, [skill]: newXp }
      };
    });
  };

  const addItem = (itemId: string, quantity: number = 1) => {
    const itemTemplate = Object.values(ITEMS).find(i => i.id === itemId);
    if (!itemTemplate) return;

    setInventory(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...itemTemplate, quantity } as InventoryItem];
    });
  };

  const useItem = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || item.quantity <= 0) return;

    if (item.heal) {
      setStats(prev => ({
        ...prev,
        hp: Math.min(prev.max_hp, prev.hp + (item.heal || 0))
      }));
      addLog(`You used a ${item.name} and healed for ${item.heal} HP.`);
      addItem(itemId, -1);
    }
  };

  const handleWoodcutting = (treeId: string) => {
    performAction('Woodcutting', 3000, () => {
      addXp('woodcutting', 25);
      addItem('wood', 1);
      addLog("You cut some logs.");
      
      // Hide the tree
      setEntities(prev => prev.map(e => e.id === treeId ? { ...e, hidden: true } : e));
      
      // Respawn after 10 seconds at a random location
      setTimeout(() => {
        setEntities(prev => prev.map(e => {
          if (e.id === treeId) {
            let newX, newY;
            do {
              newX = Math.floor(Math.random() * (MAP_WIDTH - 4)) + 2;
              newY = Math.floor(Math.random() * (MAP_HEIGHT - 4)) + 2;
            } while (WORLD_MAP[newY][newX] !== 0); // Must be grass
            
            return { ...e, position: { x: newX, y: newY }, hidden: false };
          }
          return e;
        }));
        addLog("A tree has regrown somewhere in the world.");
      }, 10000);
    });
  };

  const performAction = useCallback((type: string, duration: number, onComplete: () => void) => {
    if (activeAction || combatTarget) return;
    
    setActiveAction({ type, progress: 0 });
    
    let current = 0;
    const interval = setInterval(() => {
      current += 100;
      setActiveAction({ type, progress: (current / duration) * 100 });
      
      if (current >= duration) {
        clearInterval(interval);
        setActiveAction(null);
        onComplete();
      }
    }, 100);
  }, [activeAction, combatTarget]);

  const startCombat = (name: string, hp: number) => {
    if (activeAction || combatTarget) return;
    setCombatTarget({ name, hp, max_hp: hp });
    addLog(`You started combat with ${name}.`);
  };

  useEffect(() => {
    if (!combatTarget) return;

    const combatInterval = setInterval(() => {
      const currentStats = statsRef.current;
      const attackLevel = getSkillInfo(currentStats.xp.attack).level;
      const strengthLevel = getSkillInfo(currentStats.xp.strength).level;
      const defenceLevel = getSkillInfo(currentStats.xp.defence).level;

      // Player hits enemy
      // Accuracy: 60% base + 0.5% per level
      const accuracy = Math.min(0.95, 0.6 + (attackLevel * 0.005));
      const hitLands = Math.random() < accuracy;

      if (hitLands) {
        const maxHit = 1 + Math.floor(strengthLevel / 8) + (equipped === 'bronze_sword' ? 3 : 0);
        const playerDamage = Math.floor(Math.random() * maxHit) + 1;
        
        setCombatTarget(prev => {
          if (!prev) return null;
          const newHp = prev.hp - playerDamage;
          if (newHp <= 0) {
            addLog(`You defeated the ${prev.name}!`);
            addXp('attack', 10); // Bonus XP on kill
            addItem('shrimp', 1); // Loot
            const goldDrop = Math.floor(Math.random() * 10) + 5;
            setStats(prev => ({ ...prev, gold: prev.gold + goldDrop }));
            addLog(`You found ${goldDrop} GP.`);
            return null;
          }
          return { ...prev, hp: newHp };
        });
        
        addXp('attack', 4); // XP per successful hit
        addLog(`You hit the ${combatTarget.name} for ${playerDamage} damage.`);
      } else {
        addLog(`You missed the ${combatTarget.name}.`);
      }

      // Enemy hits player
      // Enemy accuracy reduced by player defence
      const enemyBaseAccuracy = 0.4;
      const enemyAccuracy = Math.max(0.1, enemyBaseAccuracy - (defenceLevel * 0.005));
      const enemyHitLands = Math.random() < enemyAccuracy;

      if (enemyHitLands) {
        const enemyDamage = Math.floor(Math.random() * 2) + 1;
        setStats(prev => {
          const newHp = Math.max(0, prev.hp - enemyDamage);
          if (newHp === 0) {
            addLog("You have died! You lost some items.");
            setCombatTarget(null);
            return { ...prev, hp: prev.max_hp }; // Simple respawn
          }
          return { ...prev, hp: newHp };
        });
        addXp('defence', 2); // XP for taking a hit
      } else {
        addLog(`The ${combatTarget.name} missed you.`);
      }
    }, 2400); // 2.4s is the classic "tick" speed for combat

    return () => clearInterval(combatInterval);
  }, [combatTarget, equipped]);

  const travelTo = (locationId: string) => {
    if (activeAction || combatTarget) return;
    performAction('Traveling', 2000, () => {
      setCurrentLocation(locationId);
      addLog(`You arrived at ${locationId.replace('_', ' ')}.`);
    });
  };

  const movePlayer = (dx: number, dy: number) => {
    if (activeAction || combatTarget) return;
    setStats(prev => {
      const newX = prev.position.x + dx;
      const newY = prev.position.y + dy;
      
      // Bounds check
      if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) return prev;
      
      // Collision check (WORLD_MAP)
      if (WORLD_MAP[newY][newX] === 1) return prev; // Water/Wall
      
      return {
        ...prev,
        position: { x: newX, y: newY }
      };
    });
  };

  return {
    stats,
    inventory,
    activeAction,
    combatTarget,
    equipped,
    setEquipped,
    startCombat,
    currentLocation,
    travelTo,
    movePlayer,
    chatMessages,
    sendChatMessage,
    logs,
    addLog,
    addXp,
    addItem,
    addGold: (amount: number) => setStats(prev => ({ ...prev, gold: prev.gold + amount })),
    useItem,
    handleWoodcutting,
    performAction,
    isSaving,
    entities,
    lastHit
  };
}
