import { loadStartupNotes } from './startup-notes';
import { createRoot } from 'react-dom/client';
import { LectureSite, validateCourse } from '@olgakraven/lecture-engine';
import '@olgakraven/lecture-engine/style.css';
import './site.css';
const root = createRoot(document.getElementById('root')!);
async function load() {
  root.render(<p role="status">Загружаем курс…</p>);
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'course.json', { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error('Не удалось загрузить курс: ' + r.status);
    const c = await r.json();
    validateCourse(c);
    const url = new URL(location.href);
    const previous = url.searchParams.get('slide');
    if (previous) {
      const replacement = previous.replace(/-c(\d+)-(mechanism|mistake)$/, '-c$1-decision');
      if (replacement !== previous && c.lectures.some((l: { slides: { id: string }[] }) => l.slides.some(s => s.id === replacement))) {
        url.searchParams.set('slide', replacement);
        history.replaceState(history.state, '', url);
      }
    }
    await loadStartupNotes(c, import.meta.env.BASE_URL);
    root.render(<LectureSite course={c} base={import.meta.env.BASE_URL} />);
  } catch (e) {
    root.render(<main><h1>Курс не загрузился</h1><p role="alert">{String(e)}</p><button onClick={() => void load()}>Повторить</button></main>);
  }
}
void load();