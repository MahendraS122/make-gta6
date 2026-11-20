import { cars } from './actors.js';
import { beacon, jobs } from './contracts.js';
export const ui = document.createElement('div');
ui.id = 'interface';
ui.innerHTML = `
	<header><div class="wordmark">SOUTHLINE<span>CITY OF TIDES</span></div><div class="edition">A CITY THAT NEVER<br>KEEPS ITS PROMISES.</div><div class="time"><b id="clock">12:00 · NOON</b><span>HARBOR DISTRICT · SOUTH COAST</span></div></header>
	<div class="district"><i></i> FREE ROAM <span> / </span> SOUTH HARBOR</div>
	<section class="vitals panel"><small>VITALS</small><div class="vitalrow"><b id="healthText">100</b><div class="meter"><i id="healthBar"></i></div><span>HP</span></div><div class="cash" id="money">$ 000,250</div><div id="wanted" aria-label="Wanted level">☆☆☆☆☆</div><div class="weapon" id="weapon">UNARMED <span> / RIGHT CLICK TO ACT</span></div></section>
	<section class="contract panel"><small id="contractCount">THE LONG WAY HOME / 01—05</small><h2 id="contractTitle">SALT AIR</h2><p id="objective">Collect the sealed parcel at the harbor.</p><div class="contractFooter"><span id="distance">◆ 100 M</span><b id="reward">+$350</b></div></section>
	<aside class="map panel"><div class="mapHead"><b>SOUTH HARBOR</b><span>N ↑</span></div><svg id="minimap" viewBox="0 0 220 182" aria-label="City minimap"><rect width="220" height="182" fill="#1a343b"/><path fill="#354447" d="M0 19H220V182H0Z"/><path stroke="#748383" stroke-width="14" d="M110 19V182M0 94H220"/><path stroke="#b6ad8c" stroke-width="1" d="M110 19V182M0 94H220"/><path stroke="#526463" stroke-width="2" d="M36 19V182M70 19V182M150 19V182M188 19V182M0 46H220M0 142H220"/><g id="mapCars"></g><circle id="mapGoal" r="4.5" fill="#f4c078" stroke="#fff0d0"/><circle id="mapPlayer" r="4.5" fill="#e8f6e7" stroke="#264852" stroke-width="2"/></svg><div class="mapFoot"><span>⌖ SOUTHLINE BAY</span><span id="speed">ON FOOT</span></div></aside>
	<div class="toast" id="toast">Welcome to Southline. The city is yours.</div>
	<footer><span><b>CLICK</b> MOVE / ENTER CAR</span><span><b>RIGHT CLICK</b> ACT / EXIT</span><span><b>DRAG</b> ORBIT</span><span><b>SCROLL</b> ZOOM</span><button id="timeButton">CHANGE TIME</button><button id="garageButton">GARAGE</button></footer>
	<section class="overlay" id="gameOver" hidden><small>SOUTHLINE EMERGENCY DISPATCH</small><h1>WASHED OUT.</h1><p id="deathText"></p><button id="restart">BACK TO THE STREETS ↗</button></section>
	<section class="garage panel" id="garagePanel" hidden><small>TIDELINE CUSTOMS</small><h2>MAKE IT YOURS.</h2><p id="garageText">Bring a vehicle to the turquoise garage marker.</p><div id="swatches"></div><button id="repair">REPAIR · $100</button><button id="save">SAVE CITY</button><button id="closeGarage">CLOSE</button></section>`;
document.body.append(ui);
const find = id => document.getElementById(id);
let toastTimer = 0;
export function notify(message) { find('toast').textContent = message; toastTimer = 4.5; find('toast').classList.add('visible'); }
export function updateHUD(state, dt) {
	find('healthText').textContent = Math.ceil(Math.max(0, state.health)).toString().padStart(3, '0');
	find('healthBar').style.width = Math.max(0, state.health) + '%';
	find('money').textContent = '$ ' + Math.floor(state.money).toLocaleString('en-US').padStart(7, '0');
	find('wanted').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
	find('wanted').classList.toggle('hot', state.wanted > 0);
	find('weapon').textContent = `${state.weapon || 'UNARMED'} / ${state.vehicle ? 'IN VEHICLE · ' + Math.ceil(state.vehicle.hp) + '% HULL' : 'RIGHT CLICK TO ACT'}`;
	find('clock').textContent = { noon: '12:00 · NOON', day: '09:00 · DAY', night: '21:18 · NIGHT' }[state.time];
	const job = jobs[state.contract];
	find('contractCount').textContent = job ? `THE LONG WAY HOME / 0${state.contract + 1}—05` : 'ALL CONTRACTS COMPLETE';
	find('contractTitle').textContent = job ? job.title.split(' · ')[1] : 'THE CITY IS YOURS';
	find('objective').textContent = job ? job.detail : 'Five contracts. One city. Keep exploring, or visit Tideline Customs.';
	if (state.contract === 2 && state.vehicle?.kind !== 'traffic' && state.vehicle) find('objective').textContent = 'Deliver the gold coupe to the motel beacon.';
	find('distance').textContent = job ? `◆ ${Math.round(state.player.position.distanceTo(beacon.position))} M` : '◆ FREE ROAM';
	find('reward').textContent = job ? '+$' + job.reward.toLocaleString('en-US') : 'PAID IN FULL';
	const mapPoint = position => [110 + position.x * .94, 94 + position.z * .78];
	const dot = (id, position) => { const [x, y] = mapPoint(position); find(id).setAttribute('cx', x); find(id).setAttribute('cy', y); };
	dot('mapPlayer', state.player.position); dot('mapGoal', beacon.position);
	find('mapGoal').style.display = job ? '' : 'none';
	find('mapCars').innerHTML = cars.filter(record => record.alive).map(record => { const [x, y] = mapPoint(record.root.position); return `<rect x="${x - 1.5}" y="${y - 2}" width="3" height="4" fill="${record.kind === 'police' ? '#ee6e66' : '#a3b7ad'}"/>`; }).join('');
	find('speed').textContent = state.vehicle ? `${Math.round(Math.abs(state.vehicle.speed) * 3.6)} KM/H` : 'ON FOOT';
	toastTimer -= dt;
	find('toast').classList.toggle('visible', toastTimer > 0);
	find('gameOver').hidden = state.health > 0;
	find('deathText').textContent = state.death || 'The tide takes everyone eventually.';
}
