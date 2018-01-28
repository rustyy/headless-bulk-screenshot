const ScreenshotWorker = require('./ScreenshotWorker');

module.exports = async function (tasks, options) {
    const groups = tasks.filter((task) => Array.isArray(task));
    const singleTasks = tasks.filter((task) => !Array.isArray(task));

    if (singleTasks.length) {
        groups.push(singleTasks);
    }

    return Promise.all(groups.map((group) => {
            return new ScreenshotWorker(group, options).run();
        })
    );
};
