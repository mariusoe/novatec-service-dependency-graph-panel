export default [ // list of graph elements to start with
    { // node a
        data: { id: 'zebra' }
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
        data: { id: 'ab', source: 'zebra', target: 'microservice' }
    },
    { // edge ab
        data: { id: 'bc', source: 'microservice', target: 'Mysql' }
    },
    { // edge ab
        data: { id: 'ac', source: 'zebra', target: 'Mysql' }
    },
    { // edge ab
        data: { id: 'ad', source: 'zebra', target: 'd' }
    },
    { // edge ab
        data: { id: 'bd', source: 'microservice', target: 'd' }
    },
    { // edge ab
        data: { id: 'cd', source: 'Mysql', target: 'd' }
    }
];