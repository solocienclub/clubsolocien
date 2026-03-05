const jwt = require("jsonwebtoken")

module.exports = function(req,res,next){

const token = req.headers.authorization

if(!token){

return res.status(401).json({
message:"No autorizado"
})

}

try{

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
)

if(decoded.role !== "admin"){

return res.status(403).json({
message:"Acceso solo administrador"
})

}

req.user = decoded

next()

}catch(error){

res.status(401).json({
message:"Token inválido"
})

}

}