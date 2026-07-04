import { ClientRepository } from './src/repositories/ClientRepository';
import { VendorRepository } from './src/repositories/VendorRepository';

async function run() {
  const clients = await ClientRepository.list();
  const cIds = clients.map(c => c.id);
  console.log('Clients dupes:', cIds.filter((item, index) => cIds.indexOf(item) !== index));

  const vendors = await VendorRepository.list();
  const vIds = vendors.map(v => v.id);
  console.log('Vendors dupes:', vIds.filter((item, index) => vIds.indexOf(item) !== index));
}
run().catch(console.error);
