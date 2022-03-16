const express = require('express');
const http = require('http');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');
const cors = require('cors');
const { database } = require('./config/helpers');
const productRoutes = require('./routes/products')


const app = express();
const server = http.createServer(app);


const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', "DELETE", "PATCH"],
        credentials: true
    }
});

//Middlewares
app.use(cors({
    origin: '*',
    methods: ["GET", "POST", 'PUT', "DELETE", "PATCH" ],
    credentials:true,
    allowedHeaders: 'Content-Type, Authorization, Origin, X-Requested-Width, Accept'
}));

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.get('/', (req, res) => res.send('hello from homepage'));
app.use('/products', productRoutes);

//Define some array variables
let data = Array(0);
let currentData = Array(0);

//Use Socket to setup the connection 
io.sockets.on('connection', (socket) => {
    database.table('products')
    .withFields(['id', 'title', 'quantity', 'price'])
    .sort({id: -1})
    .getAll()
    .then( prods => {
        data = prods;
        io.sockets.emit('initial', {prods: [...data]});
        console.log("Initial")
    })
    .catch(err => console.log(err));
});

const program = async () => {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
    });
    //Create MySql Events

    const instance = new MySQLEvents(connection, {
        startAtEnd: true // to record only new binary logs
    });

    await instance.start().then(()=> console.log("instance started")).catch(err => console.log("error: ", err));

    console.log("before instance.addTrigger")

  
    instance.addTrigger({
        name: 'Monitor all SQL statementss',
        expression: 'mega_shop.*', //listen to mega_shop database
        statement: MySQLEvents.STATEMENTS.ALL,
        onEvent: (e) => {
            console.log("onEvent");
            currentData = e.affectedRows;
            let newData;
            switch(e.type) {
                case "DELETE": 
                    console.log("Delete");
                    // Assign current event (before) data to the newData variable
                    newData = currentData[0].before;

                    // Find index of the deleted product in the current array, if it was there
                    let index = data.findIndex(p => p.id === newData.id);

                    // If product is present, index will be gt -1
                    if (index > -1) {
                        data = data.filter(p => p.id !== newData.id);
                        io.sockets.emit('update', {prods: [...data], type: "DELETE"});
                    } else {
                        return;
                    }
                    break;
                case "UPDATE":
                    console.log("Update");
                    newData = currentData[0].after;
                    let index2 = data.findIndex( p => p.id === newData.id);

                    if(index2 > -1) {
                        data[index2] = newData;
                        io.sockets.emit('update', {prods: [...data], type: 'UPDATE'});
                        console.log('updated with UPDATE')
                    } else {
                        return;
                    }
                    break;
                case "INSERT":
                    console.log("insert");
                    database.table('products')
                        .withFields(['id', 'title', 'quantity', 'price'])
                        .sort({id: -1})
                        .getAll()
                        .then( prods => {
                            data = prods;
                            io.sockets.emit('update', {prods: [...data], type: 'INSERT'})
                            console.log('updated with INSERT')
                        })
                        .catch(err => console.log(err));

                    break;
                default:
                    break;
            }
        }
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
};

program().then();

server.listen(3000, () => {
    console.log('Server running on port 3000')
})
