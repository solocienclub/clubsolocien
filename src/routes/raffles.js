const express = require("express")
const router = express.Router()

const pool = require("../config/db")
const jwt = require("jsonwebtoken")

/* =========================
VERIFICAR ADMIN
========================= */

function verifyAdmin(req){

const token = req.headers.authorization

if(!token){
throw new Error("Token requerido")
}

const decoded = jwt.verify(
token,
process.env.JWT_SECRET
)

if(decoded.role !== "admin"){
throw new Error("No autorizado")
}

return decoded

}

/* =========================
OBTENER RIFAS ACTIVAS
========================= */

router.get("/active", async(req,res)=>{

try{

const result = await pool.query(
"SELECT *FROM raffles WHERE status='active' ORDER BY id DESC"
)

res.json(result.rows)

}catch(error){

console.error(error)

res.status(500).json({
message:"Error obteniendo rifas"
})

}

})

/* =========================
OBTENER UNA RIFA
========================= */

router.get("/:id", async(req,res)=>{

const {id} = req.params

try{

const result = await pool.query(
"SELECT * FROM raffles WHERE id=$1",
[id]
)

res.json(result.rows[0])

}catch(error){

res.status(500).json({
message:"Error rifa"
})

}

})

/* =========================
NUMEROS DE LA RIFA
========================= */

router.get("/:id/numbers", async(req,res)=>{

const {id} = req.params

try{

const numbers = await pool.query(

`SELECT number,status
FROM numbers
WHERE raffle_id=$1
ORDER BY number`,

[id]

)

res.json(numbers.rows)

}catch(error){

res.status(500).json({
message:"Error números"
})

}

})

/* =========================
ELIMINAR RIFA (SOLO ADMIN)
========================= */

router.delete("/:id", async (req,res)=>{

try{

const id = req.params.id

/* borrar números de la rifa primero */

await pool.query(`
DELETE FROM numbers
WHERE raffle_id=$1
`,[id])

/* borrar compras */

await pool.query(`
DELETE FROM purchases
WHERE raffle_id=$1
`,[id])

/* borrar transacciones */

await pool.query(`
DELETE FROM transactions
WHERE raffle_id=$1
`,[id])

/* borrar la rifa */

await pool.query(`
DELETE FROM raffles
WHERE id=$1
`,[id])

res.json({message:"Rifa eliminada"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error eliminando rifa"})

}

})

router.get("/:id/numbers", async(req,res)=>{

const {id}=req.params

const result = await pool.query(`

SELECT

n.number,
n.status,

u.name

FROM numbers n

LEFT JOIN users u
ON n.user_id = u.id

WHERE raffle_id=$1

ORDER BY number

`,[id])

res.json(result.rows)

})

module.exports = router