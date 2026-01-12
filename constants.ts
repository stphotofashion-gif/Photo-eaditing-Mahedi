
import { PagePreset } from './types';

export const PAGE_PRESETS: PagePreset[] = [
  { name: 'Passport Size', width: 600, height: 600, description: '2x2 inches (300 DPI)' },
  { name: 'A4 Print', width: 2480, height: 3508, description: 'International Standard' },
  { name: '4R Photo', width: 1200, height: 1800, description: '4x6 inches' },
  { name: 'Instagram Square', width: 1080, height: 1080, description: 'Social Media' },
  { name: 'Facebook Cover', width: 851, height: 315, description: 'Header Image' },
];

export const DRESS_PRESETS = [
  { id: 'formal_suit', label: 'Formal Suit', prompt: 'professional black business suit' },
  { id: 'casual', label: 'Casual Shirt', prompt: 'stylish casual denim shirt' },
  { id: 'traditional', label: 'Traditional', prompt: 'premium white traditional panjabi' },
  { id: 'saree', label: 'Luxury Saree', prompt: 'luxury red silk saree' },
];

export const STUDIO_COLORS = [
  { name: 'Blue', value: '#0033aa' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#cccccc' },
  { name: 'Sky', value: '#87CEEB' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Black', value: '#000000' },
  { name: 'None', value: 'transparent' },
];
