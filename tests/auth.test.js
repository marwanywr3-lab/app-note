import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Existing account sign-in never truncates passwords to the signup limit',()=>{
 const match=source.match(/<input name="password"[^>]*>/);assert.ok(match);
 const template=match[0];
 const render=new Function('authMode',`return \`${template}\``);
 const login=render('login'),signup=render('signup');
 assert.ok(!login.includes('maxlength='));assert.ok(!login.includes('minlength='));
 assert.ok(signup.includes('maxlength="16"'));assert.ok(signup.includes('minlength="6"'));
});
test('Password length rejection applies only to signup, leaving existing passwords intact',()=>{
 const start=source.indexOf('async function authenticate('),end=source.indexOf('async function resetPassword',start);
 const auth=source.slice(start,end);
 assert.ok(auth.includes("if(authMode==='signup'&&([...password].length<6||[...password].length>16))"));
 assert.ok(auth.includes("password=String(data.get('password'))"));
 assert.ok(!auth.includes("String(data.get('password')).trim()"));
});
