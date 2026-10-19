import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const stub='http://localhost:54329';
test.afterEach(async({request})=>{
  expect((await request.get(stub+'/github-control?cleanup=true')).ok()).toBe(true);
});

test('automatic public GitHub evidence stays distinct from curator status and respects public consent',async({page,browser,request},info)=>{
  test.setTimeout(180000);
  await request.get(stub+'/reset');
  await page.context().addCookies([{name:'firstpr-test-account',value:'evidence',domain:'localhost',path:'/'}]);
  await page.goto('/sign-in');await page.getByRole('button',{name:'Continue with GitHub',exact:true}).click();
  await page.getByLabel('Display name',{exact:true}).fill('Evidence fixture');
  await page.getByRole('button',{name:'Save and continue',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const {task}=await(await request.get(stub+'/task-control?fixture=2')).json();
  await page.goto(`/contributions/new?opportunity=${task}`);
  await page.getByLabel('GitHub pull-request URL',{exact:true}).fill('https://github.com/firstpr-fixture/client/pull/901');
  await page.getByRole('button',{name:'Submit pull request',exact:true}).click();
  await expect(page).toHaveURL(/\/contributions\?sent=1$/);
  const evidence=page.locator('[data-github-evidence]');
  await expect(evidence).toHaveAttribute('data-github-evidence','open');
  await expect(evidence.getByText('@fixture-contributor ↗',{exact:true})).toBeVisible();
  await expect(evidence.getByText('firstpr-fixture/client',{exact:true})).toBeVisible();
  await expect(evidence.locator('div').filter({has:page.locator('dt', {hasText:'Discussion comments'})}).last().locator('dd')).toHaveText('3');
  await expect(page.locator('.help-status')).toHaveText('submitted');
  await expect(page.locator('.verification-audit')).toHaveCount(0);
  const before=await(await request.get(stub+'/github-control')).json();
  await page.reload();await expect(evidence).toHaveAttribute('data-github-evidence','open');
  const after=await(await request.get(stub+'/github-control')).json();
  expect(after['firstpr-fixture/client/901']).toBe(before['firstpr-fixture/client/901']);

  for(const [number,state] of [[902,'draft'],[903,'closed'],[904,'merged'],[905,'unavailable'],[906,'unavailable'],[907,'unavailable'],[908,'unavailable']] as const){
    await page.getByLabel('GitHub pull-request URL',{exact:true}).fill(`https://github.com/firstpr-fixture/client/pull/${number}`);
    await page.getByRole('button',{name:'Save PR link',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'PR link saved.'})).toBeVisible();
    await expect(evidence).toHaveAttribute('data-github-evidence',state);
    await expect(page.locator('.help-status')).toHaveText('submitted');
    if(number===902) await expect(evidence.locator('dd')).toHaveText(['@fixture-contributor ↗','firstpr-fixture/client','0','0']);
    if(number===904) await expect(evidence.getByText('Merged',{exact:true})).toBeVisible();
    if(number===905||number===908) await expect(evidence.getByText(/could not be found publicly/)).toBeVisible();
    if(number===906) await expect(evidence.getByText(/request limit/)).toBeVisible();
    if(number===907) await expect(evidence.getByText(/could not be reached/)).toBeVisible();
  }
  await page.getByLabel('GitHub pull-request URL',{exact:true}).fill('https://github.com/firstpr-fixture/client/pull/904');
  await page.getByRole('button',{name:'Save PR link',exact:true}).click();
  await expect(evidence).toHaveAttribute('data-github-evidence','merged');

  const visitorContext=await browser.newContext();const visitor=await visitorContext.newPage();
  await visitor.goto('/progress');await expect(visitor.locator('.public-contribution')).toHaveCount(0);
  await page.goto('/dashboard');await page.getByRole('button',{name:'Join public progress',exact:true}).click();
  await expect(page.getByRole('button',{name:'Make my progress private',exact:true})).toBeVisible();
  await visitor.reload();await expect(visitor.locator('[data-github-evidence]')).toHaveAttribute('data-github-evidence','merged');
  await expect(visitor.locator('.public-contribution .help-status')).toHaveText('submitted');
  await expect(visitor.locator('.progress-stats [data-status="merged"] dd')).toHaveText('0');
  await expect(visitor.locator('.progress-stats [data-status="submitted"] dd')).toHaveText('1');
  await visitor.setViewportSize({width:320,height:844});
  expect(await visitor.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const results=await new AxeBuilder({page:visitor}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  await info.attach('public-github-evidence-axe.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
  expect(results.violations).toEqual([]);
  await info.attach('public-github-evidence-mobile.png',{body:await visitor.screenshot({fullPage:true}),contentType:'image/png'});
  await page.getByRole('button',{name:'Make my progress private',exact:true}).click();
  await expect(page.getByRole('button',{name:'Join public progress',exact:true})).toBeVisible();
  await visitor.reload();await expect(visitor.locator('.public-contribution')).toHaveCount(0);
  await expect(visitor.locator('[data-github-evidence]')).toHaveCount(0);
  await visitorContext.close();
});

test('matching merged PR is automatically done with GitHub audit and dashboard/public counts',async({page,browser,request})=>{
  await request.get(stub+'/reset');await request.get(stub+'/auto-merge-control');
  await page.context().addCookies([{name:'firstpr-test-account',value:'evidence',domain:'localhost',path:'/'}]);
  await page.goto('/sign-in');await page.getByRole('button',{name:'Continue with GitHub',exact:true}).click();
  await page.getByLabel('Display name',{exact:true}).fill('Auto merge fixture');
  await page.getByRole('button',{name:'Save and continue',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const {task}=await(await request.get(stub+'/task-control?fixture=2')).json();
  await page.goto(`/contributions/new?opportunity=${task}`);
  await page.getByLabel('GitHub pull-request URL',{exact:true}).fill('https://github.com/firstpr-fixture/client/pull/904');
  await page.getByRole('button',{name:'Submit pull request',exact:true}).click();
  await expect(page).toHaveURL(/\/contributions\?sent=1$/);
  await expect(page.locator('.help-status')).toHaveText('merged');
  await expect(page.getByText('Done — this contribution has been merged.',{exact:true})).toBeVisible();
  await expect(page.locator('.verification-audit')).toContainText('Automatically verified by GitHub');
  await expect(page.getByRole('button',{name:'Save PR link',exact:true})).toHaveCount(0);
  await page.goto('/dashboard');await expect(page.locator('.progress-stats [data-status="merged"] dd')).toHaveText('1');
  await page.getByRole('button',{name:'Join public progress',exact:true}).click();
  await expect(page.getByRole('button',{name:'Make my progress private',exact:true})).toBeVisible();
  const visitorContext=await browser.newContext();const visitor=await visitorContext.newPage();
  await visitor.goto('/progress');await expect(visitor.locator('.public-contribution .help-status')).toHaveText('merged');
  await expect(visitor.locator('.progress-stats [data-status="merged"] dd')).toHaveText('1');
  await page.getByRole('button',{name:'Make my progress private',exact:true}).click();
  await expect(page.getByRole('button',{name:'Join public progress',exact:true})).toBeVisible();
  await visitor.reload();await expect(visitor.locator('.public-contribution')).toHaveCount(0);
  await visitorContext.close();
});
