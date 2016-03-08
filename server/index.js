var express = require('express')
    , WooCommerceAPI = require('woocommerce-api')
    , bodyParser = require('body-parser')
    , app = express()
    , cookieParser = require('cookie-parser')
    , session = require('express-session')
    , _Port = 3000
    , env = process.env.NODE_ENV || 'development'
    , server = require('http').createServer(app);

var WooCommerce;


var getErrorStatusCode = function (errCode) {
    switch (errCode) {
        case 'woocommerce_api_unsupported_method' :
            return 400;
            break;
        case 'woocommerce_api_authentication_error' :
            return 401;
            break;
        case 'woocommerce_api_invalid_order' :
            return 404;
            break;
        case 'woocommerce_api_invalid_product' :
            return 500;
            break;
    }
}

/* To Allow cross-domain Access-Control*/
var allowCrossDomain = function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};
app.use(allowCrossDomain);

// Parsing json and urlencoded requests
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'}));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

/*initialize routes*/
app.get('/', function (req, res) {
    res.send('Welcome to our proxy server!').end();
});

app.post('/initialize', function (req, res) {
    WooCommerce = new WooCommerceAPI({
        url: req.body.storeURL,
        consumerKey: req.body.consumerKey,
        consumerSecret: req.body.consumerSecret,
        version: 'v3' // WooCommerce API version
    });
    if(WooCommerce) {
        res.send({
            data: 'Successfully Initialized',
            status: 200
        })
    } else {
        res.send({
            data: 'Not Initialized',
            status: 500
        });
    }

});

app.get('/getProducts', function (req, res) {
    if(req.query && req.query.id) {
        WooCommerce.get('products/' + req.query.id, function(err, data, response) {
            response = response && JSON.parse(response);
            if(err) {
                res.send({
                    data: err,
                    status: 500
                });
            } else if(response && response.errors && response.errors.length > 0 && response.errors[0].code) {
                res.status(getErrorStatusCode(response.errors[0].code)).send({
                    data: response,
                    status: getErrorStatusCode(response.errors[0].code)
                });
            } else {
                res.send({
                    data: response,
                    status: 200
                });
            }
        });
    } else {
        WooCommerce.get('products', function (err, data, response) {
            response = response && JSON.parse(response);
            console.log('response is::::::::::', err, response);
            if(err) {
                res.send({
                    data: err,
                    status: 500
                });
            } else if(response && response.errors && response.errors.length > 0 && response.errors[0].code) {
                res.status(getErrorStatusCode(response.errors[0].code)).send({
                    data: response,
                    status: getErrorStatusCode(response.errors[0].code)
                });
            } else {
                res.send({
                    data: response,
                    status: 200
                });
            }
        });
    }
});

app.get('/productCategories', function (req, res) {
    var url = req.query && req.query.pageSize && req.query.pageNumber ? 'products/categories?filter[limit]=' + req.query.pageSize + '&page=' + req.query.pageNumber : 'products/categories';
    console.log('url is >>>>>>>>>>>', url);
    WooCommerce.get(url, function(err, data, response) {
        console.log('error and response is : ', err, response);
        response = response && JSON.parse(response);
        if(err) {
            res.send({
                data: err,
                status: 500
            });
        } else if(response && response.errors && response.errors.length > 0 && response.errors[0].code) {
            res.status(getErrorStatusCode(response.errors[0].code)).send({
                data: response,
                status: getErrorStatusCode(response.errors[0].code)
            });
        } else {
            res.send({
                data: response,
                status: 200
            });
        }
    });
});

app.get('/getProductsByCategory', function (req, res) {
    var url = req.query && req.query.slug ? 'products?filter[category]=' + req.query.slug + '&filter[limit]=' + req.query.pageSize + '&page=' + req.query.pageNumber : 'products/';
    console.log('getProductsByCategory url is:', url);
    WooCommerce.get(url, function (err, data, response) {
        response = response && JSON.parse(response);
        if(err) {
            res.send({
                data: err,
                status: 500
            });
        } else if(response && response.errors && response.errors.length > 0 && response.errors[0].code) {
            res.status(getErrorStatusCode(response.errors[0].code)).send({
                data: response,
                status: getErrorStatusCode(response.errors[0].code)
            });
        } else {
            res.send({
                data: response,
                status: 200
            });
        }
    })
});

/**
 * Different setup for 'development' and 'production' modes
 * @type {string}
 */
if (env === 'development') {
    // Development-mode-specific configuration
    console.info('Node is running in development mode');
}
else if (env === 'test') {
    // Development-mode-specific configuration
    console.info('Node is running in test mode');
}
else {
    // Production-mode-specific configuration goes here...
    console.info('Node is running in production mode');
}


/**
 * Server init and start
 */
server.listen(_Port);

function stopWebServer() {
    server.close(function () {
        console.info('Webserver shutdown');
        process.exit();
    });
}
var gracefulShutdown = function () {
    console.info("Received kill signal, shutting down Webserver gracefully.");
    stopWebServer();
    // if after
    setTimeout(function () {
        console.error("Could not close connections in time, forcefully shutting down webserver");
        process.exit();
    }, 10 * 1000);
};


//listen for Ctrl + C
process.on('SIGINT', gracefulShutdown);

// listen for TERM signal .e.g. kill
process.on('SIGTERM', gracefulShutdown);

// listen for uncaughtException
process.on('uncaughtException', function (err) {
    console.error("Uncaught Exception: " + err);
    console.error("Stack: " + err.stack);
    process.exit(1);
});

console.info('Express server listening on port: %s', server.address().port);

module.exports = function () {
    return server;
};