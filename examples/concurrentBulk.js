const runner = require('../src/index');

const tasks = [
    [
        {
            name: 'group1-1',
            url: 'https://www.example.com',
        },
        {
            name: 'group1-2',
            url: 'https://www.example.com',
        },
        {
            name: 'group1-3',
            url: 'https://www.example.com',
        },
    ],
    [
        {
            name: 'group2-1',
            url: 'https://www.example.com',
        },
        {
            name: 'group2-2',
            url: 'https://www.example.com',
        },
    ]
];

const options = {
    dir: 'screenshots',
    filePrefix: '',
    puppeteerOptions: {
        args: ['--no-sandbox'],
    },
    pageOptions: {}
};

runner(tasks, options).then(() => {
    console.log('done');
});

