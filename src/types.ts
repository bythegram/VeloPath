export interface PersonalGoal {
  bikeType: string;
  goalDistance: number; // km
  goalDays: number;
  experienceLevel: string;
  additionalContext: string;
}

export interface TripRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: string[];
  distanceText: string;
  durationText: string;
  distanceValue: number; // meters
  durationValue: number; // seconds
  dateCreated: string;
}

export interface SmartStop {
  name: string;
  category: 'Campsite' | 'Water Refill' | 'Food Stop' | 'Scenic View';
  locationName: string;
  description: string;
  suggestedStage: string;
}

export interface GearCategory {
  name: string;
  items: {
    id: string;
    name: string;
    checked: boolean;
  }[];
}

export interface PosterConfig {
  title: string;
  subtitle: string;
  theme: 'natural-tones' | 'minimalist-dark' | 'vintage-forest' | 'topo-orange' | 'classic-sand';
  showStats: boolean;
  showWaypoints: boolean;
  customCredits: string;
  lineWeight: number;
  showMarkers: boolean;
  showElevation: boolean;
  showCityLabels: boolean;
}
