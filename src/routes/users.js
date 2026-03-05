const express = require("express")
const router = express.Router()

const pool = require("../config/db")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const multer = require("multer")

/* =========================
OBTENER PERFIL
========================= */

router.get("/me", async(req,res)=>{

try{

const token = req.headers.authorization

if(!token){
return res.status(401).json({message:"Token requerido"})
}

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
)

const userId = decoded.id

const result = await pool.query(
"SELECT id,name,lastname,email,phone,photo FROM users WHERE id=$1",
[userId]
)

res.json(result.rows[0])

}catch(error){

console.log(error)

res.status(500).json({message:"error usuario"})

}

})

/* =========================
ACTUALIZAR PERFIL
========================= */

router.put("/update", async(req,res)=>{

try{

const token = req.headers.authorization
const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const {name,phone,email} = req.body

await pool.query(

`UPDATE users
SET name=$1, phone=$2, email=$3
WHERE id=$4`,

[name,phone,email,userId]

)

res.json({message:"Perfil actualizado"})

}catch(error){

res.status(500).json({message:"error actualizar"})

}

})

/* =========================
CAMBIAR PASSWORD
========================= */

router.put("/password", async(req,res)=>{

try{

const token = req.headers.authorization
const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const {password} = req.body

const hashed = await bcrypt.hash(password,10)

await pool.query(
"UPDATE users SET password=$1 WHERE id=$2",
[hashed,userId]
)

res.json({message:"Contraseña actualizada"})

}catch(error){

res.status(500).json({message:"error password"})

}

})

/* =========================
SUBIR FOTO
========================= */

const storage = multer.diskStorage({

destination:"public/uploads",

filename:(req,file,cb)=>{
cb(null,Date.now()+file.originalname)
}

})

const upload = multer({storage})

router.post("/photo", upload.single("photo"), async(req,res)=>{

try{

const token = req.headers.authorization
const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const photo = req.file.filename

await pool.query(

"UPDATE users SET photo=$1 WHERE id=$2",

[photo,userId]

)

res.json({message:"Foto actualizada"})

}catch(error){

res.status(500).json({message:"error foto"})

}

})

module.exports = router