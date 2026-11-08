import {expect, type Page, type TestInfo} from '@playwright/test';

export async function dismissConsent(page: Page) {
  const consent = page.getByRole('dialog', {name: 'Cookie preferences'});
  await expect(consent).toBeVisible();
  await consent.getByRole('button', {name: 'Reject all'}).click();
  await expect(consent).toBeHidden();
}

export async function inspectLayouts(page: Page, info: TestInfo, name: string) {
  const positionPage = async () => {
    await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
    await page.evaluate(async () => {
      await document.fonts.ready;
      let previous = '', stableFrames = 0;
      for (let frame = 0; frame < 30 && stableFrames < 3; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const size = `${document.documentElement.scrollWidth}:${document.documentElement.scrollHeight}`;
        stableFrames = size === previous ? stableFrames + 1 : 0;
        previous = size;
      }
    });
    if ((page.viewportSize()?.width || 0) >= 1024 && await page.locator('#dashboard-content').count()) {
      await expect.poll(() => page.evaluate(() => {
        const sidebar = document.querySelector('[aria-label="Dashboard navigation"]')!.getBoundingClientRect();
        const content = document.querySelector('#dashboard-content')!.getBoundingClientRect();
        return content.left >= sidebar.right - 1 ? null : {contentLeft: Math.round(content.left), sidebarRight: Math.round(sidebar.right)};
      })).toBeNull();
    }
    if (await page.getByRole('button', {name: 'Open navigation', exact: true}).isVisible()) {
      await expect.poll(() => page.evaluate(() => {
        const menu = document.querySelector('[aria-label="Open navigation"]')!.getBoundingClientRect();
        const actions = document.querySelector('[aria-label="Workspace actions"]')!.getBoundingClientRect();
        const separated = menu.right <= actions.left + 1 || menu.bottom <= actions.top + 1;
        return separated && menu.width >= 44 && menu.height >= 44 ? null : {
          menu: {right: Math.round(menu.right), bottom: Math.round(menu.bottom), width: Math.round(menu.width), height: Math.round(menu.height)},
          actions: {left: Math.round(actions.left), top: Math.round(actions.top)},
        };
      })).toBeNull();
    }
    if (await page.getByRole('navigation', {name: 'Breadcrumb', exact: true}).isVisible()) {
      await expect.poll(() => page.evaluate(() => {
        const breadcrumb = document.querySelector('[aria-label="Breadcrumb"]')!.getBoundingClientRect();
        const actions = document.querySelector('[aria-label="Workspace actions"]')!.getBoundingClientRect();
        const separated = breadcrumb.right <= actions.left + 1 || breadcrumb.bottom <= actions.top + 1;
        return separated ? null : {breadcrumbRight: Math.round(breadcrumb.right), breadcrumbBottom: Math.round(breadcrumb.bottom), actionsLeft: Math.round(actions.left), actionsTop: Math.round(actions.top)};
      })).toBeNull();
    }
  };
  const overflow = () => page.evaluate(() => {
    if (document.documentElement.scrollWidth <= innerWidth + 1) return [];
    return Array.from(document.querySelectorAll('body *')).filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > innerWidth + 1 && getComputedStyle(element).visibility !== 'hidden';
    }).slice(-15).map(element => ({
      tag: element.tagName, text: element.textContent?.slice(0, 100), class: element.className,
      right: Math.round(element.getBoundingClientRect().right), viewport: innerWidth,
    }));
  });
  const captureLayout = async (filename: string) => {
    const screenshot = await page.screenshot({path: info.outputPath(filename), fullPage: true, scale: 'css', animations: 'disabled'});
    const height = await page.evaluate(() => Math.max(innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight));
    expect(screenshot.readUInt32BE(20), 'Full-page evidence must include the settled document height').toBeGreaterThanOrEqual(height);
  };
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 1000});
    await positionPage();
    await captureLayout(`${name}-${width}.png`);
    await expect.poll(overflow).toEqual([]);
  }
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.fontSize = '32px';
  });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 1000});
    await positionPage();
    await captureLayout(`${name}-dark-200-percent-text-${width}.png`);
    await expect.poll(overflow).toEqual([]);
  }
}
