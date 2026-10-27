import { 
  matchesDapper,
  matchesBlueDartSurface,
  matchesDelhiverySurface,
  matchesIndiaPost,
  matchesDelhiveryAir,
  matchesBlueDartAir,
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
  'SURFACE_2KG_EXCEPTION',
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
    case 'SURFACE_2KG_EXCEPTION':
      return matchesSurface2KG(courier);
    default:
      return false;
  }
}
