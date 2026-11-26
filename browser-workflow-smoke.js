async (page) => {
  const fail = message => { throw new Error(message); };
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem('zuno.tabs.guest', JSON.stringify({ version:1, active:'test', files:[
      { id:'helper', name:'math.zuno', code:'cook double(value) { yeet value * 3; }', savedCode:null },
      { id:'test', name:'math.test.zuno', code:'import "./math.zuno" as math;\nassert(math.double(3) == 6, "doubles correctly");', savedCode:null }
    ] }));
  });
  await page.goto('http://localhost:3113/playground.html');
  await page.waitForFunction(() => globalThis.ZunoWorkspace?.list().length === 2, null, { timeout:15000 });
  await page.getByRole('button', { name:'Test project', exact:true }).click();
  await page.getByLabel('Project results', { exact:true }).filter({ hasText:'0 passed, 1 failed' }).waitFor();
  await page.getByRole('button', { name:'Open math.test.zuno:2', exact:true }).click();
  await page.getByRole('button', { name:'Ask AI Ctrl+Alt+B' }).click();
  await page.getByLabel('Paste your API key').fill('mock-browser-test');
  await page.getByRole('button', { name:'Use key', exact:true }).click();
  await page.getByText('Project context', { exact:true }).click();
  await page.getByLabel('Use selected files').check();
  await page.locator('.context-files').getByLabel('math.zuno', { exact:true }).check();
  await page.locator('.context-files').getByLabel('math.test.zuno', { exact:true }).check();
  await page.getByLabel('Attach last test result').check();
  let calls = 0;
  await page.route('**/api/assistant', async route => {
    const body = route.request().postDataJSON();
    if (body.files.length !== 2 || body.code !== undefined || body.history.length || !body.testResult.includes('failed')) fail('Unexpected context sent to provider.');
    calls++;
    const reply = JSON.stringify({ summary:'Repair double and strengthen the test', edits:[
      { id:'helper', code:'cook double(value) {\n  yeet value * 2;\n}\n' },
      { id:'test', code:'import "./math.zuno" as math;\nassert(math.double(3) == 6, "doubles correctly");\nassert(math.double(0) == 0, "zero");\n' }
    ] });
    await route.fulfill({ contentType:'text/event-stream', body:'data: ' + JSON.stringify({ choices:[{ delta:{ content:reply } }] }) + '\n\ndata: [DONE]\n\n' });
  });
  const request = async () => {
    await page.getByRole('button', { name:'Suggest edit', exact:true }).click();
    await page.getByLabel('Your question').fill('Fix the failing test and add a zero case.');
    await page.getByRole('button', { name:'Ask about my code', exact:true }).click();
    await page.getByRole('dialog').filter({ hasText:'Review project changes' }).waitFor();
  };
  await request();
  const apply = page.getByRole('button', { name:'Apply reviewed changes', exact:true });
  if (await apply.isEnabled()) fail('Apply should require reviewing all changed files.');
  await page.locator('.review-files').getByRole('button', { name:'math.test.zuno', exact:true }).click();
  await page.screenshot({ path:'output/playwright/project-review-desktop.png' });
  await apply.click();
  await page.getByRole('button', { name:'Close assistant', exact:true }).click();
  await page.getByRole('button', { name:'Test project', exact:true }).click();
  await page.getByLabel('Project results', { exact:true }).filter({ hasText:'1 passed, 0 failed' }).waitFor();
  await page.getByRole('button', { name:'Ask AI Ctrl+Alt+B' }).click();
  await page.getByRole('button', { name:'Undo project edit', exact:true }).click();
  await page.getByRole('button', { name:'Close assistant', exact:true }).click();
  await page.getByRole('button', { name:'Test project', exact:true }).click();
  await page.getByLabel('Project results', { exact:true }).filter({ hasText:'0 passed, 1 failed' }).waitFor();
  await page.getByRole('button', { name:'Ask AI Ctrl+Alt+B' }).click();
  await request();
  await page.locator('.review-files').getByRole('button', { name:'math.test.zuno', exact:true }).click();
  await page.evaluate(() => { const file = ZunoWorkspace.list().find(file => file.id === 'helper');file.model.setValue(file.code + '\n'); });
  await apply.click();
  await page.getByText('A selected file changed or closed. Request a fresh review.', { exact:true }).waitFor();
  await page.getByRole('button', { name:'Reject', exact:true }).click();
  const code = await page.evaluate(() => ZunoWorkspace.list().find(file => file.id === 'helper').code);
  if (!code.includes('* 3')) fail('Stale review overwrote source.');
  if (calls !== 2) fail('Expected two mocked requests.');
  await page.getByRole('button', { name:'Disconnect', exact:true }).click();
  await page.unroute('**/api/assistant');
  await page.setViewportSize({ width:390, height:844 });
  await page.screenshot({ path:'output/playwright/project-context-mobile.png' });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail('Mobile page overflows horizontally.');
  await page.setViewportSize({ width:1440, height:1000 });
  console.log('Browser workflow passed: failing imported test, explicit context, reviewed multi-file changes, passing tests, guarded undo, stale rejection, responsive sidebar. Provider response was mocked.');
}
