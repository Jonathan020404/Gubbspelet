
import { PROPERTY_NAMES } from "./board";
import type { PropertyId } from "./board";

export interface Property {
  id: PropertyId;
  name: string;
  price: number;
  fee: number;
}

export const PROPERTIES: Record<PropertyId, Property> = {
  carStore: {
    id: "carStore",
    name: PROPERTY_NAMES.carStore,
    price: 10_000,
    fee: 3_000,
  },

  electronicsStore: {
    id: "electronicsStore",
    name: PROPERTY_NAMES.electronicsStore,
    price: 20_000,
    fee: 7_000,
  },

  furnitureStore: {
    id: "furnitureStore",
    name: PROPERTY_NAMES.furnitureStore,
    price: 20_000,
    fee: 6_000,
  },

  chocolateFactory: {
    id: "chocolateFactory",
    name: PROPERTY_NAMES.chocolateFactory,
    price: 90_000,
    fee: 30_000,
  },

  sportsStore: {
    id: "sportsStore",
    name: PROPERTY_NAMES.sportsStore,
    price: 7_000,
    fee: 2_000,
  },

  bank: {
    id: "bank",
    name: PROPERTY_NAMES.bank,
    price: 50_000,
    fee: 16_000,
  },

  groceryStore: {
    id: "groceryStore",
    name: PROPERTY_NAMES.groceryStore,
    price: 10_000,
    fee: 3_000,
  },

  burgerRestaurant: {
    id: "burgerRestaurant",
    name: PROPERTY_NAMES.burgerRestaurant,
    price: 30_000,
    fee: 10_000,
  },

  gameStudio: {
    id: "gameStudio",
    name: PROPERTY_NAMES.gameStudio,
    price: 100_000,
    fee: 33_000,
  },

  searchEngine: {
    id: "searchEngine",
    name: PROPERTY_NAMES.searchEngine,
    price: 200_000,
    fee: 65_000,
  },
};
