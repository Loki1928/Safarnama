// Shared vocabularies. Keys must match firestore.rules exactly.
export const TRIP_TYPES = { solo: 'Solo', friends: 'Friends', couple: 'Couple', family: 'Family', group: 'Group tour' };
export const TRAVEL_MODES = { train: 'Train', bus: 'Bus', flight: 'Flight', car: 'Car', bike: 'Bike', mixed: 'Mixed' };
export const BREAKDOWN = [
  { key: 'stay', label: 'Stay', hint: 'hotels, hostels', color: '#c8501e' },
  { key: 'travel', label: 'Travel', hint: 'there, back & local', color: '#136a67' },
  { key: 'food', label: 'Food', hint: 'meals & snacks', color: '#d8971c' },
  { key: 'activities', label: 'Activities', hint: 'tickets, rentals', color: '#6a4fb6' },
  { key: 'other', label: 'Other', hint: 'shopping, misc', color: '#8a8177' }
];
export const PLACE_TYPES = { stay: 'Stay', food: 'Food', activity: 'Activity', sight: 'Sight', transport: 'Transport' };
export const PLACE_EMOJI = { stay: '🛏️', food: '🍜', activity: '🎯', sight: '🏞️', transport: '🚌' };
export const REPORT_REASONS = [
  { key: 'misleading', label: 'Fake or misleading costs' },
  { key: 'spam', label: 'Spam or advertising' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'privacy', label: 'Shares someone\'s photo or details without consent' },
  { key: 'copyright', label: 'Uses photos that aren\'t theirs' }
];
export const LIMITS = { photos: 10, places: 12, title: 90, dest: 60, city: 60, highlights: 3000, tips: 1500, comment: 500, bio: 160, name: 50 };
