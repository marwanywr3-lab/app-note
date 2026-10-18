import test from 'node:test';import assert from 'node:assert/strict';
import {splitMath,formatMathMessage,mathOptions,MATH_WRITING_RULES} from '../math-render.js';
test('Fractions, roots, powers and aligned equations retain exact TeX in Arabic prose',()=>{
 const source=String.raw`الناتج \(\frac{5}{8}=0.625\)، والجذر $\sqrt{49}=7$.
\[\begin{aligned}x^2&=9\\x&=3\end{aligned}\]`;
 const parts=splitMath(source).filter(p=>p.type==='math');assert.equal(parts.length,3);assert.equal(parts[0].text,String.raw`\frac{5}{8}=0.625`);assert.equal(parts[2].display,true);assert.ok(parts[2].text.includes(String.raw`\\x`));
 const html=formatMathMessage(source);assert.equal((html.match(/dir="ltr"/g)||[]).length,3);assert.ok(html.includes('الناتج'));assert.ok(html.includes('data-display="1"'));
});
test('Legacy dollar delimiters work while literal prices, escaped dollars and code remain text',()=>{
 assert.equal(splitMath('السعر $5 ثم $8').filter(p=>p.type==='math').length,0);
 assert.equal(splitMath(String.raw`\$5 و \$8`).filter(p=>p.type==='math').length,0);
 assert.equal(splitMath('`$x$`\n```\n$$y$$\n```').filter(p=>p.type==='math').length,0);
 assert.deepEqual(splitMath('$$x^2$$').filter(p=>p.type==='math'),[{type:'math',text:'x^2',display:true}]);
 assert.equal(splitMath('$$unclosed $').filter(p=>p.type==='math').length,0);
});
test('Untrusted prose and formula attributes cannot inject HTML or event handlers',()=>{
 const html=formatMathMessage(String.raw`<img src=x onerror="alert(1)"> \(\text{" onmouseover="bad"}<script>\)`);
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot;'));
 const opts=mathOptions(true);assert.equal(opts.trust,false);assert.equal(opts.throwOnError,true);assert.equal(opts.output,'htmlAndMathml');assert.ok(opts.maxExpand<=500);assert.notEqual(mathOptions(false).macros,opts.macros);
});
test('Math writing instructions use single command backslashes and real LaTeX delimiters',()=>{
 assert.ok(MATH_WRITING_RULES.includes(String.raw`Use \( ... \)`));assert.ok(!MATH_WRITING_RULES.includes(String.raw`Use \\(`));assert.ok(MATH_WRITING_RULES.includes(String.raw`\frac{a}{b}`));assert.ok(MATH_WRITING_RULES.includes('Arabic explanations OUTSIDE'));
});
