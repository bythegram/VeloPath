import React, { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import AutocompleteInput from './AutocompleteInput';

interface WaypointItemData {
  id: string;
  text: string;
}

interface WaypointListProps {
  waypoints: string[];
  onChange: (newWaypoints: string[]) => void;
  onRemove: (index: number) => void;
}

interface SingleWaypointItemProps {
  key?: React.Key;
  item: WaypointItemData;
  index: number;
  total: number;
  onTextChange: (newText: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SingleWaypointItem({
  item,
  index,
  total,
  onTextChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SingleWaypointItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
        borderColor: '#5A6348',
        zIndex: 50,
      }}
      className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#E5E0D8] rounded-xl p-1.5 transition-colors group relative"
    >
      {/* Drag Handle */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="touch-none p-1.5 text-[#8A847C] hover:text-[#5A6348] hover:bg-[#E5E0D8]/40 rounded-lg cursor-grab active:cursor-grabbing transition shrink-0"
        title="Drag to reorder waypoint"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Waypoint Number Badge */}
      <div className="w-5 h-5 bg-[#5A6348]/10 text-[#5A6348] font-bold text-[10px] rounded-full flex items-center justify-center shrink-0 font-mono">
        {index + 1}
      </div>

      {/* Autocomplete Input */}
      <div className="flex-1 min-w-0">
        <AutocompleteInput
          type="text"
          id={`waypoint-input-${item.id}`}
          name={`waypoint-input-${item.id}`}
          value={item.text}
          onChange={onTextChange}
          placeholder={`Waypoint ${index + 1}...`}
          className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1 text-xs text-[#3D3B38] focus:outline-none focus:border-[#5A6348] transition"
        />
      </div>

      {/* Quick Move Up/Down Action Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className={`p-1 rounded-md transition ${
            index === 0
              ? 'text-[#E5E0D8] cursor-not-allowed'
              : 'text-[#8A847C] hover:text-[#5A6348] hover:bg-[#E5E0D8]/40 cursor-pointer'
          }`}
          title="Move stop up"
        >
          <ArrowUp className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className={`p-1 rounded-md transition ${
            index === total - 1
              ? 'text-[#E5E0D8] cursor-not-allowed'
              : 'text-[#8A847C] hover:text-[#5A6348] hover:bg-[#E5E0D8]/40 cursor-pointer'
          }`}
          title="Move stop down"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-[#8A847C] hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
        title="Remove waypoint"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </Reorder.Item>
  );
}

export default function WaypointList({ waypoints, onChange, onRemove }: WaypointListProps) {
  // Maintain internal items with stable unique keys
  const [items, setItems] = useState<WaypointItemData[]>(() =>
    waypoints.map((wp, idx) => ({
      id: `wp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      text: wp,
    }))
  );

  // Sync internal items if waypoints prop length or content changes from outside
  useEffect(() => {
    // Check if texts match current items
    const currentTexts = items.map((i) => i.text);
    const isDifferent =
      waypoints.length !== currentTexts.length ||
      waypoints.some((wp, idx) => wp !== currentTexts[idx]);

    if (isDifferent) {
      setItems(
        waypoints.map((wp, idx) => ({
          id: items[idx]?.id || `wp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          text: wp,
        }))
      );
    }
  }, [waypoints]);

  const handleReorder = (newItems: WaypointItemData[]) => {
    setItems(newItems);
    onChange(newItems.map((item) => item.text));
  };

  const handleItemTextChange = (index: number, newText: string) => {
    const updated = items.map((item, idx) => (idx === index ? { ...item, text: newText } : item));
    setItems(updated);
    onChange(updated.map((i) => i.text));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    handleReorder(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    handleReorder(newItems);
  };

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={handleReorder}
      className="space-y-1.5"
    >
      {items.map((item, index) => (
        <SingleWaypointItem
          key={item.id}
          item={item}
          index={index}
          total={items.length}
          onTextChange={(newText) => handleItemTextChange(index, newText)}
          onRemove={() => onRemove(index)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}
    </Reorder.Group>
  );
}
