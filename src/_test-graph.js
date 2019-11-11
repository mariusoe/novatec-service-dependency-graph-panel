export default [ // list of graph elements to start with
    { // node a
        data: { id: 'zebraxx' }
    },
    { // node b
        data: { id: 'microservice' }
    },
    { // node b
        data: { id: 'Mysql' }
    },
    { // node b
        data: { id: 'd' }
    },
    { // edge ab
        data: { id: 'ab', source: 'zebraxx', target: 'microservice' }
    },
    { // edge ab
        data: { id: 'bc', source: 'microservice', target: 'Mysql' }
    },
    { // edge ab
        data: { id: 'ac', source: 'zebraxx', target: 'Mysql' }
    },
    { // edge ab
        data: { id: 'ad', source: 'zebraxx', target: 'd' }
    },
    { // edge ab
        data: { id: 'bd', source: 'microservice', target: 'd' }
    },
    { // edge ab
        data: { id: 'cd', source: 'Mysql', target: 'd' }
    }
];