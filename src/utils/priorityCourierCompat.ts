import { 
  matchesDapper,
  matchesBlueDartSurface,
  matchesDelhiverySurface,
  matchesIndiaPost,
  matchesDelhiveryAir,
  matchesBlueDartAir,
  matchesBlueDartSurface2KG,
  matchesDelhiverySurface2KG,
  matchesSurface2KG,
  ServiceableCourier
} from './priorityCourierModule';

export const COURIER_PRIORITY_STANDARD = [
  'DAPPER',
  'BLUEDART_SURFACE',
  'DELIVERY_SURFACE',
  'INDIA_POST',
  'DELIVERY_AIR',
  'BLUEDART_AIR'
];

export const COURIER_PRIORITY_EXCEPTION = [
  'DAPPER',
  'BLUEDART_SURFACE_2KG',
  'DELHIVERY_SURFACE_2KG',
  'INDIA_POST'
];

export function matchesCourierCondition(courier: ServiceableCourier, condition: string): boolean {
  switch (condition) {
    case 'DAPPER':
    case 'DAPPERS':
      return matchesDapper(courier);
    case 'BLUEDART_SURFACE':
      return matchesBlueDartSurface(courier);
    case 'DELIVERY_SURFACE':
    case 'DELHIVERY_SURFACE':
      return matchesDelhiverySurface(courier);
    case 'INDIA_POST':
      return matchesIndiaPost(courier);
    case 'DELIVERY_AIR':
    case 'DELHIVERY_AIR':
      return matchesDelhiveryAir(courier);
    case 'BLUEDART_AIR':
      return matchesBlueDartAir(courier);
    case 'BLUEDART_SURFACE_2KG':
      return matchesBlueDartSurface2KG(courier);
    case 'DELHIVERY_SURFACE_2KG':
    case 'DELIVERY_SURFACE_2KG':
      return matchesDelhiverySurface2KG(courier);
    case 'SURFACE_2KG_EXCEPTION':
      return matchesSurface2KG(courier);
    default:
      return false;
  }
}
