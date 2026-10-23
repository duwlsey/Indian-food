'use strict';
const foods = [
  ['01-Gujiya.png', '구지야', 'Gujiya'],
  ['02-Jalebi.png', '잘레비', 'Jalebi'],
  ['03-Dahi-Vada.png', '다히 바다', 'Dahi Vada'],
  ['04-Samosa.png', '사모사', 'Samosa'],
  ['05-Masala-Dosa.png', '마살라 도사', 'Masala Dosa'],
  ['06-Pani-Puri.png', '파니 푸리', 'Pani Puri'],
  ['07-Biryani.png', '비리야니', 'Biryani'],
  ['08-Tandoori-Chicken.png', '탄두리 치킨', 'Tandoori Chicken'],
  ['09-Murgh-Makhani.png', '무르그 마카니', 'Murgh Makhani'],
  ['10-Chole-Bhature.png', '촐레 바투레', 'Chole Bhature'],
  ['11-Pav-Bhaji.png', '파브 바지', 'Pav Bhaji'],
  ['12-Barfi.png', '바르피', 'Barfi'],
];
const modes = [
  ['사진 보고 맞히기', '사진 속 음식의 이름을 함께 맞혀 보세요.'],
  ['조각 뒤에 숨은 음식', '조각이 하나씩 사라지면 음식이 드러나요.'],
  ['순간 포착', '빠르게 지나가는 음식. 놓쳤다면 다시 보세요.'],
];
const app = document.querySelector('#app');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 0, index = 0, revealed = false, order = [], timer, animation;
let screen = 'home', paused = false, previousOrder = [];
try {
  const stored = JSON.parse(sessionStorage.getItem('india-quiz-last-order') || '[]');
  if (Array.isArray(stored) && stored.length === foods.length && new Set(stored).size === foods.length && stored.every(id => foods.some(f => f[0] === id))) previousOrder = stored;
} catch { /* Shuffling also works when browser storage is unavailable. */ }
function random() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function freshOrder() {
  let next;
  do { next = shuffle(foods); }
  while (previousOrder.length && next.some((food, i) => food[0] === previousOrder[i]));
  previousOrder = next.map(food => food[0]);
  try { sessionStorage.setItem('india-quiz-last-order', JSON.stringify(previousOrder)); } catch { /* Optional persistence. */ }
  return next;
}
function cleanup() {
  clearInterval(timer);
  cancelAnimationFrame(animation);
}
function home() {
  cleanup();
  screen = 'home';
  app.innerHTML = `
    <section class="hero">
      <div><div class="eyebrow">INDIAN FOOD QUIZ</div>
        <h1>사진 한 장으로 떠나는<br><em>인도 음식 여행.</em></h1>
        <p class="intro">익숙한 음식도, 처음 만나는 음식도.<br>이름을 함께 이야기하고 정답을 열어 보세요.</p>
        <span class="count">12가지 음식 · 3가지 방식 · 매번 새로운 순서</span>
      </div>
      <div class="hero-photo"><img src="photos/04-Samosa.png" alt="바삭하게 튀긴 사모사"><span class="photo-caption">Samosa · 사모사</span></div>
    </section>
    <section class="modes" aria-label="단계 선택">${modes.map((m, i) => `
      <button class="mode" data-mode="${i}"><span class="num">0${i + 1} / ${i + 1}단계</span><span class="arrow">↗</span><b>${m[0]}</b><small>${m[1]}</small></button>`).join('')}
    </section><p class="hint">단계를 고르면 시작해요. 사진 클릭 → 정답 확인 → 다음 문제</p>`;
  app.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => start(Number(button.dataset.mode)));
}
function start(m) {
  mode = m;
  index = 0;
  order = freshOrder();
  showQuestion();
}
function showQuestion() {
  cleanup();
  screen = 'game';
  revealed = false;
  paused = false;
  const food = order[index];
  app.innerHTML = `
    <div class="topline"><button class="quiet" id="home">← 단계 선택</button><h2>${mode + 1}단계 · ${modes[mode][0]}</h2><span class="progress">${String(index + 1).padStart(2, '0')} / ${order.length}</span></div>
    <div class="stage ${mode === 2 ? 'moving' : ''}" role="button" tabindex="0" aria-label="음식 사진. 클릭해서 정답 보기">
      <img class="food" src="photos/${food[0]}" alt="이 인도 음식의 이름은 무엇일까요?" draggable="false">
      ${mode === 1 ? `<div class="tiles" aria-hidden="true">${Array.from({length: 24}, () => '<span class="tile"></span>').join('')}</div>` : ''}
      ${mode === 2 ? '<div class="flight-message" hidden></div>' : ''}
    </div>
    <div class="controls">
      <div class="control-group"><button class="quiet" id="prev" ${index === 0 ? 'disabled' : ''}>← 이전 문제</button><span class="help">클릭 또는 Space로 진행</span></div>
      <div class="control-group">${mode === 1 ? '<button class="quiet" id="pause" aria-pressed="false">잠깐 멈춤</button>' : ''}${mode === 2 ? '<button class="quiet" id="replay">↻ 다시 보기</button>' : ''}<button class="primary" id="next">정답 보기 →</button></div>
    </div>
    <p class="hint" id="status" aria-live="polite">${mode === 1 ? '조각이 하나씩 사라져요. 어떤 음식일까요?' : mode === 2 ? '눈 크게 뜨고, 빠르게 지나가는 음식을 찾아보세요.' : '어떤 음식인지 함께 이야기해 보세요.'}</p>`;
  document.querySelector('#home').onclick = home;
  document.querySelector('#next').onclick = advance;
  document.querySelector('#prev').onclick = previous;
  const stage = document.querySelector('.stage');
  const image = document.querySelector('.food');
  stage.onclick = advance;
  stage.onkeydown = event => {
    if (event.key === 'Enter') { event.preventDefault(); advance(); }
  };
  image.onerror = () => {
    cleanup();
    stage.innerHTML = '<div class="error">사진을 불러오지 못했어요.<br>새로고침하거나 다음 문제로 넘어가 주세요.</div>';
  };
  if (mode === 1) {
    const tiles = shuffle([...document.querySelectorAll('.tile')]);
    let n = 0;
    timer = setInterval(() => {
      if (!paused && n < tiles.length) tiles[n++].classList.add('gone');
      if (n === tiles.length) clearInterval(timer);
    }, 450);
    const pause = document.querySelector('#pause');
    pause.onclick = () => {
      paused = !paused;
      pause.textContent = paused ? '계속 보기' : '잠깐 멈춤';
      pause.setAttribute('aria-pressed', String(paused));
    };
  }
  if (mode === 2) {
    document.querySelector('#replay').onclick = fly;
    image.onload = () => { if (!revealed && screen === 'game' && mode === 2) fly(); };
    if (image.complete && image.naturalWidth) fly();
  }
}
function fly() {
  if (screen !== 'game' || mode !== 2 || revealed) return;
  cancelAnimationFrame(animation);
  const stage = document.querySelector('.stage');
  const image = stage.querySelector('.food');
  const message = stage.querySelector('.flight-message');
  if (!image || !image.naturalWidth) return;
  message.hidden = true;
  const direction = random() < .5 ? 1 : -1;
  const width = stage.clientWidth, imageWidth = image.clientWidth;
  const y = random() * Math.max(0, stage.clientHeight - image.clientHeight);
  const duration = reducedMotion.matches ? 950 : 430;
  let started;
  image.style.visibility = 'visible';
  function frame(time) {
    if (started === undefined) started = time;
    const progress = Math.min((time - started) / duration, 1);
    const x = direction === 1 ? -imageWidth + progress * (width + imageWidth) : width - progress * (width + imageWidth);
    image.style.transform = `translate(${x}px, ${y}px)`;
    if (progress < 1) animation = requestAnimationFrame(frame);
    else {
      image.style.visibility = 'hidden';
      message.innerHTML = '어떤 음식이었을까요?<br><span>놓쳤다면 아래의 ‘다시 보기’를 눌러 보세요.</span>';
      message.hidden = false;
    }
  }
  animation = requestAnimationFrame(frame);
}
function advance() {
  if (screen !== 'game') return;
  if (!revealed) {
    revealed = true;
    cleanup();
    const stage = document.querySelector('.stage');
    stage.classList.remove('moving');
    const image = stage.querySelector('.food');
    if (image) { image.onload = null; image.style.transform = ''; image.style.visibility = 'visible'; image.alt = order[index][1]; }
    stage.querySelector('.tiles')?.remove();
    stage.querySelector('.flight-message')?.remove();
    stage.insertAdjacentHTML('beforeend', `<div class="answer"><b>${order[index][1]}</b><span>${order[index][2]}</span></div>`);
    stage.setAttribute('aria-label', '정답. 클릭해서 다음 문제');
    document.querySelector('#next').textContent = index === order.length - 1 ? '단계 마치기 →' : '다음 문제 →';
    document.querySelector('#pause')?.remove();
    document.querySelector('#replay')?.remove();
    document.querySelector('#status').textContent = `정답은 ${order[index][1]}. 한 번 더 누르면 ${index === order.length - 1 ? '단계를 마쳐요.' : '다음 음식이 나와요.'}`;
  } else {
    index++;
    if (index < order.length) showQuestion();
    else finish();
  }
}
function previous() {
  if (screen === 'game' && index > 0) { index--; showQuestion(); }
}
function finish() {
  cleanup();
  screen = 'end';
  app.innerHTML = `<section class="end"><div class="eyebrow">INDIAN FOOD QUIZ</div><h1>${mode + 1}단계를 마쳤어요.</h1><p>12가지 인도 음식 중<br>가장 먹어 보고 싶은 음식은 무엇인가요?</p><div class="end-actions">${mode < 2 ? '<button class="primary" id="continue">다음 단계로 →</button>' : ''}<button class="quiet" id="again">같은 단계 다시 하기</button><button class="quiet" id="home">단계 선택</button></div></section>`;
  document.querySelector('#continue')?.addEventListener('click', () => start(mode + 1));
  document.querySelector('#again').onclick = () => start(mode);
  document.querySelector('#home').onclick = home;
}
window.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || (event.code === 'Space' && event.target.closest('button,a'))) return;
  if (screen === 'game' && (event.code === 'Space' || event.key === 'ArrowRight')) { event.preventDefault(); advance(); }
  if (screen === 'game' && event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
  if (event.key === 'Escape' && !document.fullscreenElement) home();
});
document.querySelector('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { document.querySelector('#fullscreen').textContent = '브라우저 F11로 전체 화면'; }
};
document.addEventListener('fullscreenchange', () => {
  document.querySelector('#fullscreen').textContent = document.fullscreenElement ? '전체 화면 종료 ↙' : '전체 화면 ↗';
});
foods.forEach(food => { const image = new Image(); image.src = `photos/${food[0]}`; });
home();
