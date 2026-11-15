import { describe,it,expect } from 'vitest';
import { parseRoute,toHash } from './routes';
import { publicHash,restoredOnboardPage } from './publicRoutes';
import { moduleAvailable } from '../views/catalog/catalogAvailable';
describe('INT01 crew mounting',()=>{
 it('round-trips the canonical routes and restores the onboard page',()=>{
  for(const [page,hash] of [['crew-dynamics','#/onboard/personal/m/crew'],['ground-crew-dynamics','#/demo/fd30/ground/m/crew']] as const){
   expect(parseRoute(hash)).toEqual({view:'fd30',page});expect(toHash({view:'fd30',page})).toBe(hash);expect(publicHash(hash)).toBe(hash);
  }
  expect(restoredOnboardPage('crew-dynamics')).toBe('crew-dynamics');
 });
 it('links only the operational Crew capability from both supported perspectives',()=>{
  expect(moduleAvailable('onboard').find(c=>c.key==='fd30-crew-dynamics')?.href).toBe('#/onboard/personal/m/crew');
  expect(moduleAvailable('ground').find(c=>c.key==='fd30-crew-dynamics')?.href).toBe('#/demo/fd30/ground/m/crew');
 });
});
