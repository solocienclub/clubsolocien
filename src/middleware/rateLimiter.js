const attempts = {}

const LIMIT = 100
const WINDOW = 5 * 60 * 1000

function purchaseLimiter(req,res,next){

const ip =
req.headers["x-forwarded-for"] ||
req.socket.remoteAddress

const now = Date.now()

if(!attempts[ip]){

attempts[ip] = {
count:0,
firstAttempt:now
}

}

const data = attempts[ip]

if(now - data.firstAttempt > WINDOW){

data.count = 0
data.firstAttempt = now

}

data.count++

if(data.count > LIMIT){

return res.status(429).json({

message:"Demasiados intentos de compra. Intenta nuevamente en 5 minutos."

})

}

next()

}

module.exports = purchaseLimiter