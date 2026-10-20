import React, { useState } from 'react';
import { PersonalGoal } from '../types';
import { Target, Bike, Trophy, Sparkles, Save, Edit3 } from 'lucide-react';

interface GoalOnboardingProps {
  goals: PersonalGoal;
  onSaveGoals: (goals: PersonalGoal) => void;
}

export default function GoalOnboarding({ goals, onSaveGoals }: GoalOnboardingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bikeType, setBikeType] = useState(goals.bikeType || 'Gravel Bike');
  const [goalDistance, setGoalDistance] = useState(goals.goalDistance || 0);
  const [goalDays, setGoalDays] = useState(goals.goalDays || 1);
  const [experienceLevel, setExperienceLevel] = useState(goals.experienceLevel || 'Intermediate');
  const [additionalContext, setAdditionalContext] = useState(goals.additionalContext || '');

  React.useEffect(() => {
    setBikeType(goals.bikeType || 'Gravel Bike');
    setGoalDistance(goals.goalDistance || 0);
    setGoalDays(goals.goalDays || 1);
    setExperienceLevel(goals.experienceLevel || 'Intermediate');
    setAdditionalContext(goals.additionalContext || '');
  }, [goals, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoals({
      bikeType,
      goalDistance: Number(goalDistance),
      goalDays: Number(goalDays),
      experienceLevel,
      additionalContext,
    });
    setIsEditing(false);
  };

  const calculatedPace = goalDays > 0 ? Math.round(goalDistance / goalDays) : 0;

  return (
    <div id="goal-onboarding-panel" className="bg-white border border-[#E5E0D8] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-[#5A6348]" />
          <h2 className="text-lg font-bold text-[#2D3025]">Profile</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs font-semibold bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#3D3B38] border border-[#E5E0D8] py-1.5 px-3 rounded-lg transition cursor-pointer"
            id="edit-profile-btn"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#5A6348]" />
            Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider mb-1.5">Rig Type / Bicycle Setups</label>
            <select
              value={bikeType}
              onChange={(e) => setBikeType(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-2 text-[#3D3B38] text-sm focus:outline-none focus:border-[#5A6348] transition"
            >
              <option value="Gravel Bike">Gravel Bike (Lightweight touring)</option>
              <option value="Hardtail Mountain Bike">Hardtail MTB (Rugged singletrack)</option>
              <option value="Full Suspension Mountain Bike">Full-Suspension MTB (Technical trails)</option>
              <option value="Rigid Touring Bike">Rigid steel touring bike (Heavy duty)</option>
              <option value="Fat Bike">Fat Bike (Sand, snow, or soft terrain)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider mb-1.5">Target Distance (km)</label>
              <input
                type="number"
                value={goalDistance}
                onChange={(e) => setGoalDistance(Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-2 text-[#3D3B38] text-sm focus:outline-none focus:border-[#5A6348] transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider mb-1.5">Trip Duration (days)</label>
              <input
                type="number"
                value={goalDays}
                onChange={(e) => setGoalDays(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-2 text-[#3D3B38] text-sm focus:outline-none focus:border-[#5A6348] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider mb-1.5">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-2 text-[#3D3B38] text-sm focus:outline-none focus:border-[#5A6348] transition"
            >
              <option value="Beginner">Beginner (Prefer flat rail-trails and campgrounds)</option>
              <option value="Intermediate">Intermediate (Comfortable with some climbing & stealth camp)</option>
              <option value="Seasoned Tourer">Seasoned Tourer (High daily mileage, remote backcountry)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A67C52] uppercase tracking-wider mb-1.5">Rider Notes & Route Context</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g. Crossing high-altitude passes, seeking quiet gravel, self-supported wild camps, mostly pavement..."
              rows={2}
              className="w-full bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg px-3 py-2 text-[#3D3B38] text-sm placeholder-[#8A847C] focus:outline-none focus:border-[#5A6348] transition resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-[#FAF9F6] hover:bg-[#F1EDE7] text-[#3D3B38] border border-[#E5E0D8] py-2 px-4 rounded-lg text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-[#5A6348] hover:bg-[#4A523B] text-white py-2 px-4 rounded-lg text-sm font-bold transition shadow-sm"
              id="save-goals-btn"
            >
              <Save className="w-4 h-4" />
              Save Setup
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E0D8] text-center">
              <span className="block text-[10px] text-[#A67C52] font-bold uppercase tracking-wider mb-1">Target</span>
              <span className="text-base font-bold text-[#3D3B38]">{goals.goalDistance} <span className="text-xs text-[#8A847C] font-normal">km</span></span>
            </div>
            <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E0D8] text-center">
              <span className="block text-[10px] text-[#A67C52] font-bold uppercase tracking-wider mb-1">Duration</span>
              <span className="text-base font-bold text-[#3D3B38]">{goals.goalDays} <span className="text-xs text-[#8A847C] font-normal">days</span></span>
            </div>
            <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E0D8] text-center">
              <span className="block text-[10px] text-[#A67C52] font-bold uppercase tracking-wider mb-1">Avg Pace</span>
              <span className="text-base font-bold text-[#5A6348]">{calculatedPace} <span className="text-[10px] text-[#8A847C] font-normal">km/d</span></span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-[#3D3B38]">
            <div className="flex items-center gap-2 bg-[#FAF9F6] px-3 py-2 rounded-lg border border-[#E5E0D8]">
              <Bike className="w-4 h-4 text-[#5A6348] shrink-0" />
              <span className="text-xs">Rig: <strong className="text-[#2D3025]">{goals.bikeType}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-[#FAF9F6] px-3 py-2 rounded-lg border border-[#E5E0D8]">
              <Trophy className="w-4 h-4 text-[#5A6348] shrink-0" />
              <span className="text-xs">Level: <strong className="text-[#2D3025]">{goals.experienceLevel}</strong></span>
            </div>
            {goals.additionalContext && (
              <div className="bg-[#F1EDE7] p-2.5 rounded-lg border border-[#E5E0D8] text-xs italic text-[#8A847C]">
                &ldquo;{goals.additionalContext}&rdquo;
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#8A847C] bg-[#FAF9F6] p-2 rounded-lg border border-[#E5E0D8]">
            <Sparkles className="w-3.5 h-3.5 text-[#A67C52] shrink-0 animate-pulse" />
            <span>AI stop recommendations and gear lists adapt based on these parameters.</span>
          </div>
        </div>
      )}
    </div>
  );
}

