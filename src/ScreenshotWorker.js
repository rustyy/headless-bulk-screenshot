const fs = require('fs');
const puppeteer = require('puppeteer');

class ScreenshotWorker {
    constructor(tasks, options) {
        this.tasks = tasks;
        this.options = options;
        this.puppeteerOptions = options.puppeteerOptions;
        this.pageOptions = options.pageOptions;
        this.dir = options.dir;
        this.errors = [];
        this.log = [];

        this._printLog = this._printLog.bind(this);
        this._cleanUp = this._cleanUp.bind(this);
        this._pageScroll = this._pageScroll.bind(this);
        this._timeout = this._timeout.bind(this);

        !fs.existsSync(this.dir) ? fs.mkdirSync(this.dir) : null;
    }

    set dir(val) {
        this._dir = fs.realpathSync(val || 'screenshots');
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
        const {_printLog, _cleanUp, puppeteerOptions, pageOptions = {}} = this;

        try {
            this.browser = await puppeteer.launch(puppeteerOptions);
            this.page = await this._setupPage();

            return new Promise(async (resolve) => {
                for (let task of this.tasks) {
                    await this._screenshot(task);
                }

                await _cleanUp();
                _printLog();
                resolve();
            });
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }

    async _cleanUp() {
        await this.browser.close();
        this.page = null;
        this.browser = null;
    }

    _printLog() {
        this.log.forEach((entry) => {
            console.log(entry);
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

    async _pageScroll(ms = 500) {
        const {page} = this;

        await this._timeout(ms);

        const initial = await page.evaluate(() => {
            return {
                scrollHeight: document.body.scrollHeight,
                innerHeight: window.innerHeight
            }
        });

        let scrollMax = Math.ceil(initial.scrollHeight / initial.innerHeight);

        while (scrollMax > 0) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await this._timeout(ms);
            scrollMax--;
        }

        const currentScrollHeight = await page.evaluate(() => document.body.scrollHeight);

        if (currentScrollHeight > initial.scrollHeight) {
            await this._pageScroll(ms);
        }

        // Scroll back to top
        await page.evaluate(() => {
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        });
    }

    async _timeout(ms = 500) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    _screenshot(task) {
        let {log, _pageScroll} = this;

        return new Promise(async (resolve, reject) => {
            const {page} = this;
            const {url, before, name, waitUntil, waitFor} = task;
            const path = this._buildPath(name);

            try {
                let start = (new Date()).getTime();

                if (url) {
                    await page.goto(task.url, {waitUntil: waitUntil || 'load'});

                    if (task.pageScroll !== false) {
                        await _pageScroll(task.pageScrollInterval || 500);
                    }
                }

                waitFor && await page.waitFor(waitFor);

                let elementScreenshot = typeof before === 'function' ? await before(page) : page;

                await this._timeout();

                if (elementScreenshot === page ||
                    typeof elementScreenshot === 'undefined' ||
                    typeof elementScreenshot.screenshot === 'undefined'
                ) {
                    await page.screenshot({path: path, fullPage: true});
                } else {
                    await elementScreenshot.screenshot({path: path});
                }

                let stop = (new Date()).getTime();
                console.log(`INFO\t[${name}] took ${(stop - start) / 1000}s`);

                log.push(`SUCCESS\tScreenshot created`);
                log.push(`\t\tname: \t${name}`);
                log.push(`\t\turl: \t${url}`);
                log.push(`\t\tpath: \t${path}`);
                resolve();
            } catch (err) {
                console.error(err);
                reject(`ERROR \tScreenshot could not be saved\n\t\tname:\t${name}\n\t\turl:\t${url}\n\t\tpath:\t${path}\n`);
            }
        }).catch((e) => {
            log.push(e);
        });
    }
}

module.exports = ScreenshotWorker;
