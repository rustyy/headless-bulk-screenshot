const fs = require('fs');
const puppeteer = require('puppeteer');

class ScreenshotWorker {
    constructor(tests, options) {
        this.tests = tests;
        this.options = options;
        this.puppeteerOptions = options.puppeteerOptions;
        this.pageOptions = options.pageOptions;
        this.dir = options.dir;

        !fs.existsSync(this.dir) ? fs.mkdirSync(this.dir) : null;
    }

    set dir(val) {
        this._dir = val || `${process.cwd()}/screenshots`;
    }

    get dir() {
        return this._dir;
    }

    set browser(val) {
        this._browser = val;
    }

    get browser() {
        return this._browser;
    }

    set page(val) {
        this._page = val;
    }

    get page() {
        return this._page;
    }

    async run() {
        const {puppeteerOptions, pageOptions = {}} = this;
        this.browser = await puppeteer.launch(puppeteerOptions);
        this.page = await this._setupPage();

        return new Promise(async (resolve) => {
            for (let test of this.tests) {
                await this._screenshot(test);
            }

            await this.browser.close();
            this.page = null;
            this.browser = null;

            resolve();
        });
    }

    async _setupPage() {
        const {browser} = this;
        const {pageOptions = {}} = this;
        const page = await browser.newPage();

        if (typeof pageOptions === 'function') {
            await pageOptions(page);
        } else {
            pageOptions.viewport && await page.setViewport(pageOptions.viewport);
            pageOptions.userAgent && await page.setUserAgent(pageOptions.userAgent);
        }

        return page;
    }

    _buildPath(name) {
        const {dir, options} = this;
        const {fileSuffix: suffix = ''} = options;
        const {filePrefix: prefix = ''} = options;

        return `${dir}/${prefix}${name}${suffix}.png`;
    }

    _screenshot(task) {
        return new Promise(async (resolve, reject) => {
            const {page} = this;
            const {url, before, name, waitUntil, waitFor} = task;
            const path = this._buildPath(name);

            try {
                url ? await page.goto(task.url, {waitUntil: waitUntil || 'load'}) : null;
                waitFor && await page.waitFor(waitFor);

                typeof before === 'function' ? await before(page) : null;
                await page.screenshot({path: path, fullPage: true});

                console.log(`-- ${name} -> ${path}`);
                resolve();
            } catch (err) {
                reject('screenshot could not be saved');
            }
        });
    }
}

module.exports = ScreenshotWorker;
