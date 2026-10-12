import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const c=read('public/course.json'),bank=read('public/assessment.json'),questions=read('authoring/questions.json');
const original=read('authoring/original-course.json');
assert.deepEqual(c.lectures.map(l=>l.id),original.topics.map(t=>t.id));
for(const [index,lecture] of c.lectures.entries())for(const [conceptIndex,concept] of original.topics[index].concepts.entries()){
 const prefix=lecture.id+'-c'+(conceptIndex+1);
 for(const suffix of ['definition','case','decision','notebook'])assert.ok(lecture.slides.some(s=>s.id===prefix+'-'+suffix),prefix+'-'+suffix);
 assert.equal(lecture.slides.find(s=>s.id===prefix+'-definition').title,concept.name);
}
const slides=new Map(c.lectures.flatMap(l=>l.slides.map(s=>[s.id,s])));
for(const l of c.lectures){assert.equal(l.slides[0].kind,'title');assert.equal(l.slides[1].kind,'agenda');assert.equal(l.slides.at(-1).kind,'questions');}
for(const q of questions){const s=q.slideIds.map(id=>slides.get(id));assert.ok(s.every(Boolean));const tasks=s.filter(x=>x.task);assert.deepEqual(tasks.map(s=>s.task.type),['single','multiple','short','matching']);assert.ok(s.filter(x=>x.visual).length>=2);assert.ok(s.some(x=>x.notebook));assert.ok(s.some(x=>x.id.endsWith('-worked')));assert.deepEqual(s.slice(-4),tasks);for(const id of q.evidence)assert.ok(q.slideIds.indexOf(id)<q.slideIds.indexOf(tasks[0].id));for(const s of tasks){const t=s.task,k=bank.keys[t.id];assert.equal(t.type,k.type);if(t.type==='single')assert.equal(t.options.length,4);if(t.type==='multiple'){assert.equal(t.options.length,5);assert.equal(t.choose,k.correct.length);}if(t.type==='matching'){assert.equal(t.items.length,4);assert.equal(new Set(Object.values(k.pairs)).size,4);assert.notDeepEqual(t.options.map(o=>o.id),t.items.map(i=>k.pairs[i.id]));}}}
const migration=read('reports/migration-map.json');assert.equal(migration.length,2288);for(const m of migration)for(const id of m.newSlideIds)assert.ok(slides.has(id),id);
{const p=read('public/teacher-pack.json');assert.equal(p.courseId,c.id);assert.equal(p.contentVersion,c.contentVersion);assert.equal(Object.keys(p.notes).length,slides.size);for(const [id] of slides){const n=p.notes[id];assert.ok(n.script.length>100,id);assert.ok(n.preparation);assert.ok(n.estimatedSeconds>0);}assert.equal(new Set(Object.values(p.notes).map(n=>n.script)).size,slides.size);}
console.log(JSON.stringify({questions:questions.length,mappedOriginalSlides:migration.length,slides:slides.size,status:'passed'}));