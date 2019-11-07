export default [ // list of graph elements to start with
    { // node a
        data: { id: 'a' }
    },
    { // node b
        data: { id: 'b' }
    },
    { // node b
        data: { id: 'c' }
    },
    { // node b
        data: { id: 'd' }
    },
    { // edge ab
        data: { id: 'ab', source: 'a', target: 'b' }
    },
    { // edge ab
        data: { id: 'bc', source: 'b', target: 'c' }
    },
    { // edge ab
        data: { id: 'ac', source: 'a', target: 'c' }
    },
    { // edge ab
        data: { id: 'ad', source: 'a', target: 'd' }
    },
    { // edge ab
        data: { id: 'bd', source: 'b', target: 'd' }
    },
    { // edge ab
        data: { id: 'cd', source: 'c', target: 'd' }
    }
];