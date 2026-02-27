import React, { useEffect, useRef } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { getSkillInfo, LOCATIONS, WORLD_MAP, TILE_SIZE, ITEMS, MAP_WIDTH, MAP_HEIGHT } from './constants';
import { 
  Sword, 
  Pickaxe, 
  Axe, 
  Backpack, 
  BarChart3, 
  MessageSquare, 
  Map as MapIcon,
  Flame,
  Shield,
  MoveRight,
  MousePointer2,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { 
    stats, 
    inventory, 
    activeAction, 
    logs, 
    addXp, 
    addItem, 
    addGold,
    useItem,
    handleWoodcutting,
    performAction,
    addLog,
    isSaving,
    combatTarget,
    startCombat,
    equipped,
    setEquipped,
    currentLocation,
    travelTo,
    movePlayer,
    chatMessages,
    sendChatMessage,
    entities
  } = useGameEngine();

  const [activeTab, setActiveTab] = React.useState<'inventory' | 'skills' | 'combat' | null>(null);
  const [chatInput, setChatInput] = React.useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp': case 'w': movePlayer(0, -1); break;
        case 'ArrowDown': case 's': movePlayer(0, 1); break;
        case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
        case 'ArrowRight': case 'd': movePlayer(1, 0); break;
        case 'i': setActiveTab(prev => prev === 'inventory' ? null : 'inventory'); break;
        case 'k': setActiveTab(prev => prev === 'skills' ? null : 'skills'); break;
        case 'c': setActiveTab(prev => prev === 'combat' ? null : 'combat'); break;
        case 'Escape': setActiveTab(null); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  const location = LOCATIONS[currentLocation] || LOCATIONS['lumbridge_courtyard'];

  const handleMining = (ore: 'copper_ore' | 'tin_ore') => {
    performAction('Mining', 4000, () => {
      addXp('mining', 35);
      addItem(ore, 1);
      addLog(`You mined some ${ore.replace('_', ' ')}.`);
    });
  };

  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [activeTab]);

  const handleEntityInteraction = (entity: any) => {
    if (entity.hidden) return;

    // Proximity check
    const dist = Math.sqrt(
      Math.pow(stats.position.x - entity.position.x, 2) + 
      Math.pow(stats.position.y - entity.position.y, 2)
    );
    
    if (dist > 1.5) {
      addLog(`You are too far from the ${entity.name}.`);
      return;
    }

    switch(entity.type) {
      case 'tree': handleWoodcutting(entity.id); break;
      case 'rock': handleMining(entity.subType === 'copper' ? 'copper_ore' : 'tin_ore'); break;
      case 'npc': startCombat(entity.name, 15); break;
      case 'bank': 
        addLog("You accessed the bank. (Bank UI coming soon!)");
        break;
      case 'forge': 
        addLog("Walk to the forge to smelt bronze in the interactions panel.");
        break;
    }
  };

  // Camera Calculation
  const worldWidth = MAP_WIDTH * TILE_SIZE;
  const worldHeight = MAP_HEIGHT * TILE_SIZE;
  
  const playerPxX = stats.position.x * TILE_SIZE + TILE_SIZE / 2;
  const playerPxY = stats.position.y * TILE_SIZE + TILE_SIZE / 2;

  let camX = dimensions.width / 2 - playerPxX;
  let camY = dimensions.height / 2 - playerPxY;

  // Clamp Camera
  if (worldWidth > dimensions.width) {
    camX = Math.max(dimensions.width - worldWidth, Math.min(0, camX));
  } else {
    camX = (dimensions.width - worldWidth) / 2;
  }

  if (worldHeight > dimensions.height) {
    camY = Math.max(dimensions.height - worldHeight, Math.min(0, camY));
  } else {
    camY = (dimensions.height - worldHeight) / 2;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-sans flex flex-col">
      {/* Header / Top Bar */}
      <header className="h-14 bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-600 rounded flex items-center justify-center font-bold text-white">R</div>
          <h1 className="font-bold tracking-tight text-lg">RuneQuest</h1>
        </div>
        <div className="flex items-center gap-6">
          {isSaving && <span className="text-[10px] text-gray-500 animate-pulse">Saving...</span>}
          <div className="flex items-center gap-2">
            <div className="w-32 h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
              <div 
                className="h-full bg-red-600 transition-all duration-300" 
                style={{ width: `${(stats.hp / stats.max_hp) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono">{stats.hp}/{stats.max_hp} HP</span>
          </div>
          <div className="text-amber-400 font-mono text-sm">
            {stats.gold.toLocaleString()} GP
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col" ref={containerRef}>
        {/* Canvas World */}
        <div className="flex-1 bg-[#111] relative overflow-hidden">
          <Stage width={dimensions.width} height={dimensions.height}>
            <Layer x={camX} y={camY}>
              {/* Map Tiles */}
              {WORLD_MAP.map((row, y) => 
                row.map((tile, x) => (
                  <Rect
                    key={`${x}-${y}`}
                    x={x * TILE_SIZE}
                    y={y * TILE_SIZE}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={tile === 1 ? '#1a365d' : tile === 2 ? '#4a5568' : '#2d3748'}
                    stroke="#1a202c"
                    strokeWidth={0.5}
                  />
                ))
              )}

              {/* Entities */}
              {entities.filter(e => !e.hidden).map(entity => (
                <Group 
                  key={entity.id} 
                  x={entity.position.x * TILE_SIZE} 
                  y={entity.position.y * TILE_SIZE}
                  onClick={() => handleEntityInteraction(entity)}
                  onTap={() => handleEntityInteraction(entity)}
                >
                  <Rect
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={
                      entity.type === 'tree' ? '#059669' : 
                      entity.type === 'rock' ? '#718096' : 
                      entity.type === 'npc' ? '#e53e3e' : 
                      entity.type === 'bank' ? '#3182ce' : '#d97706'
                    }
                    cornerRadius={4}
                  />
                  <Text
                    text={
                      entity.type === 'tree' ? '🌲' : 
                      entity.type === 'rock' ? '🪨' : 
                      entity.type === 'npc' ? '👤' : 
                      entity.type === 'bank' ? '🏦' : '🔥'
                    }
                    fontSize={24}
                    x={10}
                    y={10}
                  />
                </Group>
              ))}

              {/* Player */}
              <Group x={stats.position.x * TILE_SIZE} y={stats.position.y * TILE_SIZE}>
                <Circle
                  radius={15}
                  x={TILE_SIZE/2}
                  y={TILE_SIZE/2}
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth={2}
                  shadowBlur={10}
                  shadowColor="#fbbf24"
                />
                <Text
                  text="You"
                  fontSize={10}
                  fill="#fff"
                  x={TILE_SIZE/2 - 10}
                  y={TILE_SIZE/2 - 25}
                  fontStyle="bold"
                />
              </Group>
            </Layer>
          </Stage>

          {/* Controls Overlay */}
          <div className="absolute top-4 left-4 bg-black/50 p-3 rounded-lg backdrop-blur-sm border border-white/10 pointer-events-none">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Controls</div>
            <div className="flex gap-2 items-center text-xs">
              <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-600">WASD</kbd>
              <span>Move</span>
            </div>
            <div className="flex gap-2 items-center text-xs mt-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-600">Click</kbd>
              <span>Interact</span>
            </div>
            <div className="flex gap-2 items-center text-xs mt-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-600">I / K / C</kbd>
              <span>Menus</span>
            </div>
          </div>

          {/* Logs Overlay (Bottom Left) */}
          <div className="absolute bottom-4 left-4 w-72 h-40 bg-gradient-to-t from-black/60 to-transparent overflow-hidden flex flex-col pointer-events-none">
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[10px] flex flex-col justify-end">
              {logs.slice(-10).map((log, i) => (
                <div key={i} className={cn(
                  "transition-opacity duration-500 drop-shadow-md",
                  i === logs.slice(-10).length - 1 ? "text-amber-400 font-bold" : "text-gray-300 opacity-70"
                )}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Floating UI Dock (Bottom Right) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-4 items-end">
            {/* Nearby Actions Mini-Panel */}
            <div className="flex flex-col gap-2 w-64">
              {Math.sqrt(Math.pow(stats.position.x - 10, 2) + Math.pow(stats.position.y - 11, 2)) < 2 && (
                <InteractionCard 
                  title="Buy Healing Potion" 
                  description="Costs 50 GP"
                  icon={<Heart size={14} className="text-red-500" />}
                  onClick={() => {
                    if (stats.gold >= 50) {
                      addItem('healing_potion', 1);
                      addGold(-50);
                      addLog("You bought a healing potion for 50 GP.");
                    } else {
                      addLog("You don't have enough gold!");
                    }
                  }}
                  disabled={stats.gold < 50}
                />
              )}
              {Math.sqrt(Math.pow(stats.position.x - 5, 2) + Math.pow(stats.position.y - 15, 2)) < 2 && (
                <InteractionCard 
                  title="Smelt Bronze" 
                  description="Requires 1 Copper + 1 Tin"
                  icon={<Flame size={14} className="text-orange-600" />}
                  onClick={() => {
                    const copper = inventory.find(i => i.id === 'copper_ore');
                    const tin = inventory.find(i => i.id === 'tin_ore');
                    if (copper && tin && copper.quantity > 0 && tin.quantity > 0) {
                      performAction('Smithing', 5000, () => {
                        addItem('copper_ore', -1);
                        addItem('tin_ore', -1);
                        addItem('bronze_bar', 1);
                        addXp('smithing', 50);
                        addLog("You smelted a bronze bar.");
                      });
                    } else {
                      addLog("You need copper and tin ore to smelt bronze.");
                    }
                  }}
                  disabled={!!activeAction || !!combatTarget}
                  progress={activeAction?.type === 'Smithing' ? activeAction.progress : 0}
                />
              )}
            </div>

            {/* Main Navigation Dock */}
            <div className="bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex gap-2 shadow-2xl">
              <button 
                onClick={() => setActiveTab(prev => prev === 'inventory' ? null : 'inventory')}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                  activeTab === 'inventory' ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/5 text-gray-400 hover:bg-white/10"
                )}
              >
                <Backpack size={20} />
              </button>
              <button 
                onClick={() => setActiveTab(prev => prev === 'skills' ? null : 'skills')}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                  activeTab === 'skills' ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/5 text-gray-400 hover:bg-white/10"
                )}
              >
                <BarChart3 size={20} />
              </button>
              <button 
                onClick={() => setActiveTab(prev => prev === 'combat' ? null : 'combat')}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                  activeTab === 'combat' ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/5 text-gray-400 hover:bg-white/10"
                )}
              >
                <Sword size={20} />
              </button>
            </div>
          </div>

          {/* Modal Popups */}
          <AnimatePresence>
            {activeTab && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
                onClick={() => setActiveTab(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                      {activeTab === 'inventory' && <><Backpack size={16} /> Inventory</>}
                      {activeTab === 'skills' && <><BarChart3 size={16} /> Skills</>}
                      {activeTab === 'combat' && <><Sword size={16} /> Combat</>}
                    </h3>
                    <button onClick={() => setActiveTab(null)} className="text-gray-500 hover:text-white transition-colors">
                      <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'inventory' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-3">
                          {Array.from({ length: 28 }).map((_, i) => {
                            const item = inventory[i];
                            const isEquipped = item && equipped === item.id;
                            return (
                              <div 
                                key={i} 
                                onClick={() => {
                                  if (item?.type === 'equipment') {
                                    setEquipped(equipped === item.id ? null : item.id);
                                  }
                                }}
                                className={cn(
                                  "aspect-square bg-[#111] border border-white/5 rounded-xl flex items-center justify-center relative group cursor-pointer hover:border-amber-500/50 transition-all hover:scale-105",
                                  isEquipped && "border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                )}
                              >
                                {item ? (
                                  <>
                                    <span className="text-3xl">{item.icon}</span>
                                    <span className="absolute bottom-1 right-2 text-[10px] font-mono text-amber-400 font-bold">{item.quantity}</span>
                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black text-white text-[10px] p-2 rounded shadow-xl z-50 pointer-events-none border border-white/10">
                                      <div className="font-bold mb-1">{item.name}</div>
                                      {item.heal && <div className="text-green-400">Heals {item.heal} HP</div>}
                                      <div className="text-gray-400 italic">Click to use/equip</div>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {/* Quick Use Panel */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Consumables</h4>
                          <div className="flex gap-3">
                              {inventory.filter(i => i.type === 'consumable' && i.quantity > 0).map(item => (
                                <button 
                                  key={item.id}
                                  onClick={() => useItem(item.id)}
                                  className="p-3 bg-[#2a2a2a] border border-white/5 rounded-xl hover:border-amber-500 transition-all hover:scale-110 flex items-center gap-2"
                                >
                                  <span className="text-xl">{item.icon}</span>
                                  <span className="text-xs font-bold">{item.quantity}</span>
                                </button>
                              ))}
                              {inventory.filter(i => i.type === 'consumable' && i.quantity > 0).length === 0 && (
                                <div className="text-[10px] text-gray-600 italic">No consumables available</div>
                              )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'skills' && (
                      <div className="grid grid-cols-1 gap-4">
                        {(Object.entries(stats.xp) as [import('./types').Skill, number][]).map(([skill, xp]) => (
                          <SkillRow key={skill} name={skill} xp={xp} />
                        ))}
                      </div>
                    )}

                    {activeTab === 'combat' && (
                      <div className="text-center py-10">
                        <Sword className="mx-auto text-gray-800 mb-4" size={64} />
                        <div className="text-gray-400 text-sm mb-2 font-bold">Combat Mastery</div>
                        <div className="text-gray-600 text-xs px-8">Equip weapons and armor to increase your combat effectiveness. Defeat enemies to gain Attack and Defence XP.</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* Progress Bar for Active Action */}
          <AnimatePresence>
            {activeAction && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#2a2a2a] p-4 rounded-xl border border-amber-500/30 shadow-2xl z-50"
              >
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span>{activeAction.type}...</span>
                  <span>{Math.floor(activeAction.progress)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${activeAction.progress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combat Overlay */}
          <AnimatePresence>
            {combatTarget && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#1a1a1a] border-2 border-red-900/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(127,29,29,0.3)] z-50"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold mb-2">Adventurer</div>
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div className="h-full bg-green-600 transition-all" style={{ width: `${(stats.hp / stats.max_hp) * 100}%` }} />
                    </div>
                    <div className="text-xs mt-1">{stats.hp} / {stats.max_hp} HP</div>
                  </div>
                  <div className="px-8 text-4xl font-serif italic text-red-500">VS</div>
                  <div className="text-center flex-1">
                    <div className="text-2xl font-bold mb-2">{combatTarget.name}</div>
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div className="h-full bg-red-600 transition-all" style={{ width: `${(combatTarget.hp / combatTarget.max_hp) * 100}%` }} />
                    </div>
                    <div className="text-xs mt-1">{combatTarget.hp} / {combatTarget.max_hp} HP</div>
                  </div>
                </div>
                <div className="text-center text-gray-500 animate-pulse">Combat in progress...</div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

function InteractionCard({ title, description, icon, onClick, disabled, progress = 0 }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden group p-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-left transition-all hover:border-amber-500/50 hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed w-full",
        disabled && "scale-[0.98]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#1a1a1a] rounded group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-100 text-xs">{title}</h4>
          <p className="text-[10px] text-gray-600">{description}</p>
        </div>
      </div>
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      )}
    </button>
  );
}

function SkillRow({ name, xp }: { name: string, xp: number }) {
  const info = getSkillInfo(xp);
  return (
    <div className="p-3 bg-[#1a1a1a] border border-[#333] rounded hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2a2a2a] rounded flex items-center justify-center text-gray-400">
            {name === 'attack' && <Sword size={14} />}
            {name === 'defence' && <Shield size={14} />}
            {name === 'woodcutting' && <Axe size={14} />}
            {name === 'mining' && <Pickaxe size={14} />}
            {name === 'smithing' && <Flame size={14} />}
          </div>
          <span className="capitalize text-sm font-medium">{name}</span>
        </div>
        <div className="text-right">
          <div className="text-amber-500 font-bold text-lg leading-none">{info.level}</div>
          <div className="text-[10px] text-gray-500 font-mono">{xp.toLocaleString()} XP</div>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${info.progress}%` }}
          className="h-full bg-amber-500/50"
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-600 uppercase tracking-tighter">Progress</span>
        <span className="text-[9px] text-gray-500 font-mono">{Math.floor(info.progress)}%</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-all relative",
        active ? "text-amber-500 bg-[#222]" : "text-gray-500 hover:text-gray-300"
      )}
    >
      {icon}
      {active && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
    </button>
  );
}
