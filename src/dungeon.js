import { F, W, RW, PIT, RAMP, RF } from './cells.js';
import { torch, rune, button, pushplate, banner, chain, skull, door } from './cells.js';

// 16x16 dungeon - properly partitioned with doors
// Areas: Start room (SW), Great Hall (NW), Corridor, Cave (E), Upper level (NE)
const DUNGEON = [
  //0    1    2    3    4    5    6    7    8    9    10   11   12   13   14   15
  [W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W()], //0
  [W(),F({ceilingHeight:5,ceilingStyle:"vaulted",items:[chain(),torch("W")]}),F({ceilingHeight:5,ceilingStyle:"vaulted"}),F({ceilingHeight:5,ceilingStyle:"vaulted",items:[banner("E")]}),W(),F({items:[torch("E")]}),F(),F({items:[door("E")]}),F({items:[torch("W")]}),F(),F(),F({items:[torch("E")]}),F(),F(),F({items:[torch("W")]}),W()], //1
  [W(),F({ceilingHeight:5,ceilingStyle:"vaulted"}),F({ceilingHeight:5,ceilingStyle:"vaulted"}),F({ceilingHeight:5,ceilingStyle:"vaulted",items:[torch("E")]}),W(),F(),F(),W(),F(),F(),F(),F(),F(),F(),F(),W()], //2
  [W(),F({ceilingHeight:5,ceilingStyle:"vaulted",items:[rune("W")]}),F({ceilingHeight:5,ceilingStyle:"vaulted"}),F({ceilingHeight:5,ceilingStyle:"vaulted",items:[skull("S")]}),W(),F({items:[torch("W")]}),F({items:[door("S")]}),W(),F(),W(),W(),W(),W(),F(),F(),W()], //3
  [W(),F({items:[torch("E")]}),F(),F({items:[door("S")]}),W(),W(),F(),W(),F({items:[door("E")]}),W(),RW(),RW(),W(),F({items:[torch("W")]}),F(),W()], //4
  [W(),F(),F(),F(),F({items:[door("E")]}),F(),F(),F({items:[torch("E")]}),W(),W(),RW(),F({wallStyle:"rough",items:[torch("N")]}),RW(),F(),F({items:[rune("N")]}),W()], //5
  [W(),F({items:[torch("W")]}),F(),F(),W(),F(),F(),F(),W(),RW(),F({wallStyle:"rough"}),F({wallStyle:"rough"}),F({wallStyle:"rough",items:[torch("E")]}),W(),W(),W()], //6
  [W(),F(),F(),F({items:[pushplate()]}),W(),F({items:[banner("N")]}),F(),F({items:[door("S")]}),W(),RW(),F({wallStyle:"rough",ceilingStyle:"vaulted",ceilingHeight:3.5}),F({wallStyle:"rough",ceilingStyle:"vaulted",ceilingHeight:3.5}),RW(),W(),W(),W()], //7
  [W(),W(),F({items:[door("S")]}),W(),W(),W(),F(),W(),W(),RW(),F({wallStyle:"rough",ceilingStyle:"vaulted",ceilingHeight:3.5,items:[torch("W")]}),F({wallStyle:"rough",ceilingStyle:"vaulted",ceilingHeight:3.5}),RW(),W(),W(),W()], //8
  [W(),F({items:[torch("E")]}),F(),F(),F(),F({items:[torch("S")]}),F(),F({items:[door("E")]}),W(),W(),F({wallStyle:"rough"}),F({wallStyle:"rough"}),RW(),W(),W(),W()], //9
  [W(),F(),F(),F({items:[skull("W")]}),F(),F(),F(),W(),W(),W(),F({wallStyle:"rough",items:[torch("S")]}),F({wallStyle:"rough"}),RW(),W(),W(),W()], //10
  [W(),F(),F(),F({items:[banner("N")]}),F(),F({items:[torch("W")]}),F({items:[door("S")]}),W(),W(),RW(),F({wallStyle:"rough"}),F({wallStyle:"rough"}),F({wallStyle:"rough",items:[door("S")]}),W(),W(),W()], //11
  [W(),W(),W(),W(),W(),W(),F(),F({items:[torch("E")]}),W(),RW(),F({wallStyle:"rough"}),PIT(),PIT(),RW(),W(),W()], //12
  [W(),F({items:[torch("E")]}),F(),F(),F({items:[chain()]}),F(),F(),F({items:[rune("S"),torch("W")]}),W(),RW(),F({wallStyle:"rough",items:[torch("S")]}),PIT(),PIT(),RW(),W(),W()], //13
  [W(),F(),F({items:[pushplate()]}),F(),F(),F(),F(),F(),W(),RW(),RW(),RW(),RW(),RW(),W(),W()], //14
  [W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W(),W()], //15
];

export default DUNGEON;
