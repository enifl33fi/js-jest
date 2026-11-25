const FORM_URL = 'https://kodaktor.ru/g/puppetform';

const HEADLESS = process.env.HEADLESS === 'false' ? false : 'new';
const SLOWMO = Number(process.env.SLOWMO || 0);

describe('Форма заказа', () => {
  let browser;
  let page;
  let puppeteer;

  beforeAll(async () => {
    puppeteer = await import('puppeteer');

    browser = await puppeteer.launch({
      headless: HEADLESS,
      slowMo: SLOWMO,
      defaultViewport: { width: 1280, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    page.on('pageerror', () => {});
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    await page.goto(FORM_URL, { waitUntil: 'networkidle2', timeout: 60_000 });
  });

  test('форма отображается на странице', async () => {
    const form = await page.$('[data-test="contact-form"]');
    expect(form).not.toBeNull();

    for (const sel of ['#name', '#email', '#tel', '#message', 'button[type="submit"]']) {
      expect(await page.$(sel)).not.toBeNull();
    }
  });

  test('пустая форма не отправляется (нативная валидация)', async () => {
    await page.click('button[type="submit"]');
    const display = await page.evaluate(() => {
      const m = document.querySelector('[data-test="modal"]');
      return m ? getComputedStyle(m).display : 'absent';
    });
    expect(display).not.toBe('block');
  });

  test('заполнение и успешная отправка показывает модальное окно', async () => {
    await page.type('#name', 'Тест');
    await page.type('#email', 't@t.ru');
    await page.type('#tel', '123');
    await page.type('#message', 'msg');
    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => {
      const m = document.querySelector('[data-test="modal"]');
      return m && getComputedStyle(m).display === 'block';
    });

    const heading = await page.$eval(
      '[data-test="modal"] .title',
      (el) => el.textContent.trim()
    );
    expect(heading).toBe('Спасибо большое за ваш вклад!');
  });

  test('модальное окно закрывается по крестику и удаляется из DOM', async () => {
    await page.type('#name', 'Тест');
    await page.type('#email', 't@t.ru');
    await page.type('#tel', '123');
    await page.type('#message', 'msg');
    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('[data-test="modal"]')).display === 'block'
    );

    await page.click('[data-test="modal"] button.modal-close');
    await page.waitForFunction(
      () => document.querySelector('[data-test="modal"]') === null
    );
  });
});