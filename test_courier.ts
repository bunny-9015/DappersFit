import { selectCourierCandidates, isExceptionOrder, matchesCourierCondition } from './src/utils/courierSelector';

const couriersList = [
  { courierId: 201, courierName: 'BlueDart Air Premium', rate: 145.00 },
  { courierId: 202, courierName: 'BlueDart Surface 2KG', rate: 85.00 },
  { courierId: 203, courierName: 'Delhivery Express (Air)', rate: 110.00 },
  { courierId: 204, courierName: 'Delhivery Surface', rate: 65.00 },
  { courierId: 208, courierName: 'India Post Speed Post', rate: 40.00 },
  { courierId: 209, courierName: 'Dappers', rate: 45.00 },
  { courierId: 210, courierName: 'Delhivery Surface 2kg', rate: 75.00 }
];

const standardOrder = { items: [{ name: 'Test Product', sku: 'SKU1' }] };
const exceptionOrder = { items: [{ name: 'Product wg Test', sku: 'SKU2' }] };

console.log('--- Standard Order ---');
console.log(selectCourierCandidates(standardOrder, couriersList).map(c => c.courierName));

console.log('--- Exception Order ---');
console.log(selectCourierCandidates(exceptionOrder, couriersList).map(c => c.courierName));
