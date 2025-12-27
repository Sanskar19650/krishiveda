
export type UserRole = 'FARMER' | 'BUYER' | 'AGENT' | 'ADMIN';
export type CropCategory = 'VEGETABLE' | 'FRUIT' | 'FLOWER';

export interface CropRecord {
  id: string;
  farmerId: string;
  category: CropCategory;
  name: string;
  area: number;
  sowingDate: string;
  harvestDate: string;
  imageUrl: string;
  status: 'PENDING' | 'AUTHORIZED' | 'REJECTED';
}

export interface SoilTestRequest {
  id: string;
  farmerId: string;
  location: string;
  status: 'BOOKED' | 'COLLECTED' | 'LAB_SUBMITTED' | 'REPORT_READY';
  reportUrl?: string;
  recommendations?: string;
}

export interface MarketProduct {
  id: string;
  farmerId: string;
  farmerName: string;
  name: string;
  category: CropCategory;
  rate: number;
  unit: string;
  stock: number;
  imageUrl: string;
}

export interface LiveRate {
  item: string;
  market: string;
  price: number;
  unit: string;
}
