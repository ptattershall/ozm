/** Single accessory entry in the assets manifest. */
export type AccessoryAsset = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  svgUrl: string;
  /** Default z-index hint (higher = more on top when added). */
  defaultZ?: number;
};

/** Root structure of public/assets/manifest.json */
export type AccessoriesManifest = {
  version: number;
  categories: string[];
  assets: AccessoryAsset[];
};
