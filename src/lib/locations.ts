/**
 * Band of Blades campaign map locations.
 *
 * Source: Band of Blades rulebook, pages 120-121 (Commander section — Advance).
 * Each location specifies:
 *   - assets_rating: base dice pool for the QM's Acquire Assets action
 *   - bonus_assets:  extra dice for specific asset types at this location
 *   - available_mission_types: what missions can be selected here
 *
 * This is static rulebook data — stored as a typed constant rather than a
 * database table, since it never changes during normal play. Custom locations
 * can be added to this array; no code changes are required elsewhere.
 */

export type AssetType =
  | 'FOOD'
  | 'HORSES'
  | 'BLACK_SHOT'
  | 'RELIGIOUS_SUPPLIES'
  | 'ALCHEMIST'
  | 'MERCY'
  | 'LABORER'
  | 'SIEGE_WEAPON';

export type MissionType =
  | 'ASSAULT'
  | 'RECON'
  | 'SUPPLY'
  | 'RELIGIOUS';

export interface Location {
  id: string;
  name: string;
  /** Base dice pool for Acquire Assets rolls. */
  assets_rating: number;
  /**
   * Additional dice for specific asset types at this location.
   * E.g. { FOOD: 2, HORSES: 2 } means +2d for Food and Horses rolls.
   */
  bonus_assets: Partial<Record<AssetType, number>>;
  /** Mission types available when the Legion is stationed here. */
  available_mission_types: MissionType[];
  /** Short flavour description for the UI. */
  description: string;
  /** Extra notes — e.g. resource costs, special rules. */
  notes?: string;
  /**
   * IDs of locations the Legion can advance to from here.
   * BoB rulebook pp. 120-121 (campaign map).
   */
  connections: string[];
}

export const LOCATIONS: Location[] = [
  {
    id: 'western_front',
    name: 'Western Front',
    assets_rating: 0,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON'],
    description: 'Open battlefield. Little to forage.',
    connections: ['plainsworth'],
  },
  {
    id: 'plainsworth',
    name: 'Plainsworth',
    assets_rating: 2,
    bonus_assets: { FOOD: 2, HORSES: 2 },
    available_mission_types: ['ASSAULT', 'RECON', 'SUPPLY', 'RELIGIOUS'],
    description: 'Fertile farming settlement. Rich in food and livestock.',
    connections: ['sunstrider_camp', 'long_road'],
  },
  {
    id: 'long_road',
    name: 'Long Road',
    assets_rating: 0,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON'],
    description: 'A harsh march. Supplies consumed faster than usual.',
    notes: 'Extra Food cost while stationed here.',
    connections: ['barrak_mines'],
  },
  {
    id: 'barrak_mines',
    name: 'Barrak Mines',
    assets_rating: 2,
    bonus_assets: { BLACK_SHOT: 2 },
    available_mission_types: ['ASSAULT', 'RECON', 'SUPPLY'],
    description: 'Mining complex. Black Shot is abundant.',
    connections: ['gallows_pass'],
  },
  {
    id: 'gallows_pass',
    name: 'Gallows Pass',
    assets_rating: 1,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON', 'RELIGIOUS'],
    description: 'Mountain pass with a grim history. A place of old faith.',
    connections: ['talgon_forest'],
  },
  {
    id: 'sunstrider_camp',
    name: 'Sunstrider Camp',
    assets_rating: 1,
    bonus_assets: { HORSES: 2 },
    available_mission_types: ['ASSAULT', 'RECON'],
    description: 'Former cavalry encampment. Horses still run wild here.',
    connections: ['duresh_forest', 'westlake'],
  },
  {
    id: 'duresh_forest',
    name: 'Duresh Forest',
    assets_rating: 1,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON', 'RELIGIOUS'],
    description: 'Dense old-growth forest. Sacred to the old faiths.',
    connections: ['talgon_forest'],
  },
  {
    id: 'talgon_forest',
    name: 'Talgon Forest',
    assets_rating: 1,
    bonus_assets: {},
    available_mission_types: ['RECON', 'RELIGIOUS'],
    description: 'Quiet and deep. Better for scouting than fighting.',
    connections: ['fort_calisco'],
  },
  {
    id: 'westlake',
    name: 'Westlake',
    assets_rating: 3,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON', 'SUPPLY', 'RELIGIOUS'],
    description: 'Prosperous lakeside town. Well-stocked and accessible.',
    connections: ['eastlake'],
  },
  {
    id: 'eastlake',
    name: 'Eastlake',
    assets_rating: 3,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON', 'SUPPLY', 'RELIGIOUS'],
    description: 'Sister city to Westlake. Equal in resources.',
    connections: ['fort_calisco'],
  },
  {
    id: 'fort_calisco',
    name: 'Fort Calisco',
    assets_rating: 2,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON', 'SUPPLY', 'RELIGIOUS'],
    description: 'A fortified position with solid supply lines.',
    connections: ['high_road', 'the_maw'],
  },
  {
    id: 'high_road',
    name: 'High Road',
    assets_rating: 0,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RECON'],
    description: 'Exposed mountain road. No time to forage.',
    connections: ['skydagger_keep'],
  },
  {
    id: 'the_maw',
    name: 'The Maw',
    assets_rating: 0,
    bonus_assets: {},
    available_mission_types: ['ASSAULT', 'RELIGIOUS'],
    description: 'A blighted pass. Strange and terrible. Faith may help.',
    connections: ['skydagger_keep'],
  },
  {
    id: 'skydagger_keep',
    name: 'Skydagger Keep',
    assets_rating: 1,
    bonus_assets: {},
    available_mission_types: [],
    description: 'The final destination. The last stand of the 338th.',
    notes: 'Endgame location — no missions available.',
    connections: [],
  },
];

/** Look up a location by its ID. Returns undefined if not found. */
export function getLocation(id: string): Location | undefined {
  if (!id) return undefined;
  const normalizedId = id.toLowerCase().replace(/\s+/g, '_');
  return LOCATIONS.find((l) => l.id === normalizedId);
}

/**
 * Get the total dice pool for an Acquire Assets roll at the given location
 * for the given asset type.
 *
 * = location.assets_rating + (bonus_assets[assetType] ?? 0)
 */
export function getAssetsDicePool(location: Location, assetType: AssetType): number {
  return location.assets_rating + (location.bonus_assets[assetType] ?? 0);
}

/** Returns the Location objects reachable from a given location ID. */
export function getConnections(locationId: string): Location[] {
  const loc = getLocation(locationId);
  if (!loc) return [];
  return loc.connections.map((id) => getLocation(id)).filter((l): l is Location => l !== undefined);
}
