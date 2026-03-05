const express = require("express")
const router = express.Router()

const pool = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

/* =========================
   REGISTRO
========================= */

router.post("/register", async (req,res)=>{

const {name,lastname,email,password,cedula,phone} = req.body

if(!name || !lastname || !email || !password){

return res.status(400).json({
message:"Faltan datos"
})

}

/* validar password */

const strongPassword =
/^(?=.*[A-Za-z])(?=.*\d).{8,}$/

if(!strongPassword.test(password)){

return res.status(400).json({
message:"La contraseña debe tener mínimo 8 caracteres y un número"
})

}

try{

const checkUser = await pool.query(

"SELECT * FROM users WHERE email=$1",

[email]

)

if(checkUser.rows.length > 0){

return res.status(400).json({
message:"El correo ya está registrado"
})

}

/* hash password */

const hashedPassword = await bcrypt.hash(password,10)

/* guardar usuario */

const newUser = await pool.query(

`INSERT INTO users
(name,lastname,email,password,cedula,phone)
VALUES($1,$2,$3,$4,$5,$6)
RETURNING id,email`,

[name,lastname,email,hashedPassword,cedula,phone]

)

const user = newUser.rows[0]

/* crear token */

const token = jwt.sign(

{
id:user.id,
cedula:user.cedula,
role:user.role
},

process.env.JWT_SECRET,

{
expiresIn:"7d"
}

)

res.json({

message:"Usuario registrado correctamente",
token

})

}catch(error){

console.error(error)

res.status(500).json({
message:"Error en registro"
})

}

})


/* =========================
   LOGIN
========================= */

router.post("/login", async (req,res)=>{

const {cedula,password} = req.body

if(!cedula || !password){

return res.status(400).json({
message:"Faltan datos"
})

}

try{

const result = await pool.query(

"SELECT * FROM users WHERE cedula=$1",

[cedula]

)

if(result.rows.length === 0){

return res.status(400).json({
message:"Usuario no existe"
})

}

const user = result.rows[0]

const validPassword = await bcrypt.compare(
password,
user.password
)

if(!validPassword){

return res.status(400).json({
message:"Contraseña incorrecta"
})

}

const token = jwt.sign(

{
id:user.id,
cedula:user.cedula,
role:user.role
},

process.env.JWT_SECRET,

{
expiresIn:"7d"
}

)

res.json({

message:"Login correcto",
token

})

}catch(error){

console.error(error)

res.status(500).json({
message:"Error en login"
})

}

})
module.exports = router