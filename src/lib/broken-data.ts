import { BrokenName } from './types';

export interface BrokenAbility {
  name: string;
  description: string;
  unlock_condition: string;
}

export interface BrokenLieutenant {
  name: string;
  description: string;
}

export interface BrokenInfamous {
  name: string;
  description: string;
}

export interface BrokenTemplate {
  name: BrokenName;
  title: string;
  description: string;
  abilities: BrokenAbility[];
  lieutenants: BrokenLieutenant[];
  infamous: BrokenInfamous[];
}

export const BROKEN_TEMPLATES: Record<BrokenName, BrokenTemplate> = {
  BLIGHTER: {
    name: 'BLIGHTER',
    title: 'The Blighter',
    description: 'A twisted corruption of nature, spreading rot and plague wherever it treads.',
    abilities: [
      { name: 'Miasma', description: 'Plague clouds obscure the sun.', unlock_condition: 'Time clock 1 fills' },
      { name: 'Rotting Earth', description: 'Ground becomes treacherous.', unlock_condition: 'Time clock 2 fills' },
      { name: 'Contagion', description: 'Wounds fester and spread.', unlock_condition: 'Time clock 3 fills' },
    ],
    lieutenants: [
      { name: 'Gorgos', description: 'The Flesh-Stitcher' },
    ],
    infamous: [
      { name: 'The Pale Rider', description: 'Harbinger of decay' },
    ],
  },
  BREAKER: {
    name: 'BREAKER',
    title: 'The Breaker',
    description: 'A juggernaut of pure destruction, focused on shattering walls and spirits alike.',
    abilities: [
      { name: 'Sunder', description: 'Fortifications crumble.', unlock_condition: 'Time clock 1 fills' },
      { name: 'Earthquake', description: 'The very world trembles.', unlock_condition: 'Time clock 2 fills' },
      { name: 'Catested Bones', description: 'Fear becomes physical.', unlock_condition: 'Time clock 3 fills' },
    ],
    lieutenants: [
      { name: 'Iron-Jawed', description: 'Commander of the siege' },
    ],
    infamous: [
      { name: 'The Wall-Breaker', description: 'A giant among undead' },
    ],
  },
  RENDER: {
    name: 'RENDER',
    title: 'The Render',
    description: 'A spectral nightmare that tears at the soul, leaving only empty husks behind.',
    abilities: [
      { name: 'Soul Tear', description: 'Mental stress increases.', unlock_condition: 'Time clock 1 fills' },
      { name: 'Ghost Lights', description: 'Illusions lead the way to doom.', unlock_condition: 'Time clock 2 fills' },
      { name: 'Spirit Void', description: 'Hope is extinguished.', unlock_condition: 'Time clock 3 fills' },
    ],
    lieutenants: [
      { name: 'Mist-Walker', description: 'Master of shadows' },
    ],
    infamous: [
      { name: 'The Hollow King', description: 'A ruler of nothing' },
    ],
  },
};
