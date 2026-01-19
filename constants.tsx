
import { Concept, PhotoboothSettings } from './types';

export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby3SIzV13FGsbxMPYHv2JHPr9b_JFvF19xDpbiTfyKw9Y9TBzpYMR0fkPMRTWc3m7x4/exec';

export const DEFAULT_CONCEPTS: Concept[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    prompt: 'Transform this person into a high-tech cyberpunk character with neon implants, reflective clothing, and a futuristic night city background with purple and teal lights. Maintain facial identity.',
    thumbnail: 'https://picsum.photos/seed/cyber/300/500'
  },
  {
    id: 'steampunk',
    name: 'Steampunk Explorer',
    prompt: 'Transform this person into a Victorian steampunk explorer wearing goggles, leather gear, and brass mechanical accessories. Background is a steam-filled dirigible cockpit. Maintain facial identity.',
    thumbnail: 'https://picsum.photos/seed/steam/300/500'
  },
  {
    id: 'astronaut',
    name: 'Space Nomad',
    prompt: 'Transform this person into a realistic astronaut on Mars. High-detailed spacesuit with NASA patches, red dusty landscape background. Maintain facial identity.',
    thumbnail: 'https://picsum.photos/seed/space/300/500'
  },
  {
    id: 'fantasy',
    name: 'Elven Royalty',
    prompt: 'Transform this person into ethereal elven royalty with glowing intricate crowns, silk robes, and a mystical enchanted forest background. Maintain facial identity.',
    thumbnail: 'https://picsum.photos/seed/elf/300/500'
  },
  {
    id: 'anime',
    name: 'Anime Protagonist',
    prompt: 'Transform this person into a high-quality 2D anime style protagonist with vibrant energy auras and stylized features. Maintain key facial structures.',
    thumbnail: 'https://picsum.photos/seed/anime/300/500'
  },
  {
    id: 'vintage',
    name: 'Retro 80s',
    prompt: 'Transform this person into a 1980s synthwave style icon with big hair, neon sunglasses, and a grid sun background. Maintain facial identity.',
    thumbnail: 'https://picsum.photos/seed/retro/300/500'
  }
];

export const DEFAULT_SETTINGS: PhotoboothSettings = {
  eventName: 'COROAI PHOTOBOOTH',
  eventDescription: 'Transform Your Reality into Digital Art',
  folderId: '1knqeFCrMVhUlfzmuu-AVTkZmFF3Dnuqy',
  selectedModel: 'gemini-2.5-flash-image', // Default to Free/Fast model
  overlayImage: null,
  backgroundImage: null,
  autoResetTime: 60,
  adminPin: '1234',
  orientation: 'portrait',
  cameraRotation: 0
};
