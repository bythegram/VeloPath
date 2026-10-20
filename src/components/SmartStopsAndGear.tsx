import React, { useState } from 'react';
import { SmartStop, GearCategory, PersonalGoal } from '../types';
import { MapPin, Compass, Tent, ShoppingBag, Droplet, CheckSquare, Square, RefreshCw, Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';

interface SmartStopsAndGearProps {
  origin: string;
  destination: string;
  waypoints: string[];
  totalDistance: string;
  totalDuration: string;
  personalGoals: PersonalGoal;
  
  smartStops: SmartStop[];
  setSmartStops: React.Dispatch<React.SetStateAction<SmartStop[]>>;
  
  gearCategories: GearCategory[];
  setGearCategories: React.Dispatch<React.SetStateAction<GearCategory[]>>;
  onAddWaypoint?: (stopName: string) => void;
}

export default function SmartStopsAndGear({
  origin,
  destination,
  waypoints,
  totalDistance,
  totalDuration,
  personalGoals,
  smartStops,
  setSmartStops,
  gearCategories,
  setGearCategories,
  onAddWaypoint,
}: SmartStopsAndGearProps) {
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingGear, setLoadingGear] = useState(false);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [gearError, setGearError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState<{ [categoryName: string]: string }>({});

  const hasRoute = Boolean(origin && destination);

  // Check if a suggested stop is already active on the route
  const isStopInRoute = (stop: SmartStop) => {
    const normLoc = stop.locationName.toLowerCase().trim();
    const normName = stop.name.toLowerCase().trim();
    return waypoints.some((wp) => {
      const normWp = wp.toLowerCase().trim();
      return (
        normWp === normLoc ||
        normWp === normName ||
        normWp.includes(normLoc) ||
        normLoc.includes(normWp)
      );
    });
  };

  // Fetch Recommended Smart Stops from server-side Gemini Proxy
  const generateSmartStops = async () => {
    if (!hasRoute) return;
    setLoadingStops(true);
    setStopsError(null);
    try {
      const response = await fetch('/api/gemini/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          waypoints,
          totalDistance,
          totalDuration,
          personalGoals: `${personalGoals.bikeType}, target ${personalGoals.goalDistance}km in ${personalGoals.goalDays} days, ${personalGoals.experienceLevel}. ${personalGoals.additionalContext}`,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.stops)) {
        setSmartStops(data.stops);
        localStorage.setItem('velopath_smart_stops', JSON.stringify(data.stops));
      } else {
        throw new Error(data.error || 'Invalid recommendations response from server.');
      }
    } catch (err: any) {
      console.error(err);
      setStopsError(err.message || 'Failed to generate stops. Please verify your Gemini API Key in secrets.');
    } finally {
      setLoadingStops(false);
    }
  };

  // Fetch Personalized Packing List from server-side Gemini Proxy
  const generateGearList = async () => {
    if (!hasRoute) return;
    setLoadingGear(true);
    setGearError(null);
    try {
      const response = await fetch('/api/gemini/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          totalDistance,
          totalDuration,
          personalGoals: `${personalGoals.bikeType}, target ${personalGoals.goalDistance}km in ${personalGoals.goalDays} days, ${personalGoals.experienceLevel}. ${personalGoals.additionalContext}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.gearList?.categories) {
        // Format to internal structures with checkboxes
        const formatted: GearCategory[] = data.gearList.categories.map((cat: any, index: number) => ({
          name: cat.name,
          items: (cat.items || []).map((item: string, itemIdx: number) => ({
            id: `gemini-item-${index}-${itemIdx}-${Date.now()}`,
            name: item,
            checked: false,
          })),
        }));
        formatted.forEach((f: any) => {
          if (f.name === "Shelter & Sleeping" || f.name === "Shelter & Sleep System" || f.name === "Sleeping System") {
            f.name = "Camp & Shelter";
          }
          if (f.name === "Hydration & Cooking" || f.name === "Nutrition & Water" || f.name === "Food & Hydration") {
            f.name = "Water & Sustenance";
          }
        });
        setGearCategories(formatted);
        localStorage.setItem('velopath_gear_categories', JSON.stringify(formatted));
      } else {
        throw new Error(data.error || 'Invalid gear list format received.');
      }
    } catch (err: any) {
      console.error(err);
      setGearError(err.message || 'Failed to generate gear checklist. Please check your Gemini API Key setup.');
    } finally {
      setLoadingGear(false);
    }
  };

  // Toggle checklist checkbox
  const toggleGearItem = (categoryName: string, itemId: string) => {
    const updated = gearCategories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      }
      return cat;
    });
    setGearCategories(updated);
    localStorage.setItem('velopath_gear_categories', JSON.stringify(updated));
  };

  // Add custom item to a category
  const addCustomItem = (categoryName: string) => {
    const itemName = newItemName[categoryName]?.trim();
    if (!itemName) return;

    const updated = gearCategories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: [
            ...cat.items,
            {
              id: `custom-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: itemName,
              checked: false,
            },
          ],
        };
      }
      return cat;
    });

    setGearCategories(updated);
    localStorage.setItem('velopath_gear_categories', JSON.stringify(updated));
    setNewItemName({ ...newItemName, [categoryName]: '' });
  };

  // Remove item from checklist
  const deleteGearItem = (categoryName: string, itemId: string) => {
    const updated = gearCategories.map((cat) => {
      if (cat.name === categoryName) {
        return {
          ...cat,
          items: cat.items.filter((item) => item.id !== itemId),
        };
      }
      return cat;
    }).filter(cat => cat.items.length > 0); // Remove category if empty

    setGearCategories(updated);
    localStorage.setItem('velopath_gear_categories', JSON.stringify(updated));
  };

  // Helper to resolve Lucide category icons
  const getStopIcon = (category: string) => {
    switch (category) {
      case 'Campsite':
        return <Tent className="w-4 h-4 text-[#A67C52]" />;
      case 'Water Refill':
        return <Droplet className="w-4 h-4 text-sky-600" />;
      case 'Food Stop':
        return <ShoppingBag className="w-4 h-4 text-amber-600" />;
      default:
        return <Compass className="w-4 h-4 text-[#5A6348]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Smart Stops Panel */}
      <div id="smart-stops-panel" className="bg-white border border-[#E5E0D8] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#5A6348]" />
            <h2 className="text-lg font-bold text-[#2D3025]">Smart Stops</h2>
          </div>
          {hasRoute && (
            <button
              onClick={generateSmartStops}
              disabled={loadingStops}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#5A6348] hover:bg-[#4A523B] disabled:bg-[#FAF9F6] disabled:text-[#8A847C] text-white py-1.5 px-3 rounded-lg transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
              id="generate-stops-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStops ? 'animate-spin' : ''}`} />
              {smartStops.length > 0 ? 'Regenerate Stops' : 'Find Stops'}
            </button>
          )}
        </div>

        {!hasRoute ? (
          <div className="text-center py-6 text-[#8A847C] text-xs bg-[#FAF9F6] rounded-lg border border-[#E5E0D8]">
            Create a cycling route on the map first to generate smart stop recommendations.
          </div>
        ) : loadingStops ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#5A6348] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-[#8A847C] font-medium">Gemini is analyzing route waypoints and cyclist goals...</div>
          </div>
        ) : stopsError ? (
          <div className="bg-red-50/50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gemini Error</p>
              <p className="opacity-90">{stopsError}</p>
            </div>
          </div>
        ) : smartStops.length === 0 ? (
          <div className="text-center py-6 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg">
            <Sparkles className="w-5 h-5 text-[#8A847C] mx-auto mb-2" />
            <p className="text-xs text-[#3D3B38]">Ready to suggest strategic camps, water refills, and refuel spots!</p>
            <button
              onClick={generateSmartStops}
              className="mt-3 text-xs font-bold text-[#5A6348] bg-[#FAF9F6] hover:bg-[#F1EDE7] py-1.5 px-4 rounded-lg border border-[#E5E0D8] transition"
            >
              Generate Smart Stops
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {smartStops.map((stop, i) => (
              <div key={i} className="bg-[#FAF9F6] rounded-lg p-3 border border-[#E5E0D8] hover:border-[#8A847C] transition group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-white rounded-lg border border-[#E5E0D8] shrink-0">
                      {getStopIcon(stop.category)}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#2D3025] leading-tight">{stop.name}</h4>
                      <p className="text-[10px] text-[#8A847C] font-semibold tracking-wide uppercase">{stop.locationName} &bull; <span className="text-[#A67C52]">{stop.suggestedStage}</span></p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-white border border-[#E5E0D8] rounded-full text-[#A67C52] font-bold uppercase tracking-wider">{stop.category}</span>
                </div>
                <p className="mt-2 text-xs text-[#3D3B38] leading-relaxed pl-1">{stop.description}</p>
                {onAddWaypoint && (
                  <div className="mt-3 flex justify-end">
                    {isStopInRoute(stop) ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#5A6348] bg-[#5A6348]/10 py-1 px-2.5 rounded-lg border border-[#5A6348]/20 select-none">
                        <CheckSquare className="w-3.5 h-3.5" /> Added to Route
                      </span>
                    ) : waypoints.length >= 5 ? (
                      <span className="text-[10px] text-[#8A847C] font-semibold bg-[#FAF9F6] border border-[#E5E0D8]/60 py-1 px-2.5 rounded-lg opacity-80" title="Route is full (Max 5 waypoints)">
                        Route full (Max 5)
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddWaypoint(stop.locationName || stop.name)}
                        className="flex items-center gap-1 text-[10px] font-bold text-white bg-[#5A6348] hover:bg-[#4A523B] py-1 px-2.5 rounded-lg transition cursor-pointer shadow-sm active:scale-95"
                        id={`add-stop-to-route-${i}`}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add as Waypoint
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Personalized Packing Checklists */}
      <div id="gear-checker-panel" className="bg-white border border-[#E5E0D8] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tent className="w-5 h-5 text-[#5A6348]" />
            <h2 className="text-lg font-bold text-[#2D3025]">Bikepacking Gear List</h2>
          </div>
          {hasRoute && (
            <button
              onClick={generateGearList}
              disabled={loadingGear}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#5A6348] hover:bg-[#4A523B] disabled:bg-[#FAF9F6] disabled:text-[#8A847C] text-white py-1.5 px-3 rounded-lg transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
              id="generate-gear-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGear ? 'animate-spin' : ''}`} />
              {gearCategories.length > 0 ? 'Regenerate List' : 'AI Packing List'}
            </button>
          )}
        </div>

        {!hasRoute ? (
          <div className="text-center py-6 text-[#8A847C] text-xs bg-[#FAF9F6] rounded-lg border border-[#E5E0D8]">
            Define a starting point and destination first to retrieve a personalized bikepacking gear list.
          </div>
        ) : loadingGear ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#5A6348] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs text-[#8A847C] font-medium">Gemini is picking lightweight gear for your ride...</div>
          </div>
        ) : gearError ? (
          <div className="bg-red-50/50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gemini Error</p>
              <p className="opacity-90">{gearError}</p>
            </div>
          </div>
        ) : gearCategories.length === 0 ? (
          <div className="text-center py-6 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg">
            <Tent className="w-5 h-5 text-[#8A847C] mx-auto mb-2" />
            <p className="text-xs text-[#3D3B38]">Generate a custom bikepacking checklist based on your rig and trip length.</p>
            <button
              onClick={generateGearList}
              className="mt-3 text-xs font-bold text-[#5A6348] bg-[#FAF9F6] hover:bg-[#F1EDE7] py-1.5 px-4 rounded-lg border border-[#E5E0D8] transition"
            >
              Generate AI Packing List
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {gearCategories.map((category) => {
              const checkedCount = category.items.filter((i) => i.checked).length;
              const totalCount = category.items.length;
              const isCompleted = checkedCount === totalCount;

              return (
                <div key={category.name} className="bg-[#FAF9F6] rounded-xl p-3 border border-[#E5E0D8]">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E5E0D8]">
                    <h3 className="text-xs font-bold text-[#2D3025] uppercase tracking-wider">{category.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-[#5A6348]/10 text-[#5A6348]' : 'bg-white text-[#8A847C] border border-[#E5E0D8]'}`}>
                      {checkedCount}/{totalCount}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[#F1EDE7]/60 transition group cursor-pointer"
                        onClick={() => toggleGearItem(category.name, item.id)}
                      >
                        <div className="flex items-center gap-2">
                          <button className="text-[#8A847C] hover:text-[#A67C52] shrink-0 focus:outline-none">
                            {item.checked ? (
                              <CheckSquare className="w-4.5 h-4.5 text-[#A67C52] fill-[#A67C52]/5" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-[#E5E0D8]" />
                            )}
                          </button>
                          <span className={`text-xs select-none transition ${item.checked ? 'line-through text-[#8A847C]' : 'text-[#3D3B38]'}`}>
                            {item.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGearItem(category.name, item.id);
                          }}
                          className="text-[#8A847C] hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Item */}
                  <div className="mt-2.5 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add custom item..."
                      value={newItemName[category.name] || ''}
                      onChange={(e) => setNewItemName({ ...newItemName, [category.name]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomItem(category.name);
                        }
                      }}
                      className="flex-1 bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1 text-xs text-[#3D3B38] placeholder-[#8A847C] focus:outline-none focus:border-[#5A6348] transition"
                    />
                    <button
                      onClick={() => addCustomItem(category.name)}
                      className="bg-white border border-[#E5E0D8] hover:bg-[#FAF9F6] text-[#3D3B38] p-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

