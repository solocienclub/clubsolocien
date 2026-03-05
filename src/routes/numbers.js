const express = require("express")
const router = express.Router()

const pool = require("../config/db")
const jwt = require("jsonwebtoken")

const purchaseLimiter = require("../middleware/rateLimiter")


/* =========================
LIBERAR RESERVAS EXPIRADAS
========================= */

async function cleanExpiredReservations(){

await pool.query(`

UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL
WHERE status='reserved'
AND reserved_at < NOW() - INTERVAL '3 minutes'

`)

}


/* =========================
MIS NUMEROS PAGADOS
========================= */

router.get("/my", async (req,res)=>{

try{

const token = req.headers.authorization
const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const raffleId = req.query.raffle

let query = `
SELECT 
n.number,
n.sold_at,

r.id as raffle_id,
r.title,
r.prize,
r.ticket_price,
r.prize_image

FROM numbers n
JOIN raffles r
ON r.id = n.raffle_id

WHERE n.user_id=$1
AND n.status='sold'
`

let params=[userId]

if(raffleId){

query += " AND n.raffle_id=$2"
params.push(raffleId)

}

query += " ORDER BY n.sold_at DESC"

const result = await pool.query(query,params)

res.json(result.rows)

}catch(error){

console.log(error)

res.status(500).json({message:"Error obteniendo números"})

}

})


/* =========================
VER NUMEROS DE UNA RIFA
========================= */

router.get("/:raffleId", async (req,res)=>{

const {raffleId} = req.params

try{

await cleanExpiredReservations()

const result = await pool.query(`

SELECT 
numbers.number,
numbers.status,
numbers.reserved_at,
users.name,
users.photo

FROM numbers

LEFT JOIN users
ON users.id = numbers.user_id

WHERE raffle_id=$1
ORDER BY number

`,[raffleId])

res.json(result.rows)

}catch(error){

console.error(error)

res.status(500).json({
error:"Error obteniendo números"
})

}

})


/* =========================
RESERVAR MULTIPLES NUMEROS
========================= */

router.post("/reserve-multiple", async(req,res)=>{

try{

const token = req.headers.authorization
const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const {numbers,raffle_id} = req.body

/* verificar disponibilidad */

const check = await pool.query(`

SELECT number,status
FROM numbers
WHERE raffle_id=$1
AND number = ANY($2::text[])

`,[raffle_id,numbers])


for(const n of check.rows){

if(n.status !== "available"){

return res.status(400).json({
message:`Número ${n.number} no disponible`
})

}

}

/* reservar */

await pool.query(`

UPDATE numbers
SET status='reserved',
user_id=$1,
reserved_at=NOW()
WHERE raffle_id=$2
AND number = ANY($3::text[])

`,[userId,raffle_id,numbers])


res.json({message:"Números reservados"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error reservando números"})

}

})


/* =========================
CONFIRMAR COMPRA
========================= */

router.post("/confirm-multiple", purchaseLimiter, async(req,res)=>{

const client = await pool.connect()

try{

const token = req.headers.authorization

if(!token){
return res.status(401).json({message:"No autorizado"})
}

const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const {numbers,raffle_id,amount} = req.body

await client.query(`

UPDATE numbers
SET 
status='sold',
sold_at=NOW()

WHERE raffle_id=$1
AND number = ANY($2::text[])

`,[raffle_id,numbers])


for(const n of check.rows){

if(n.status !== "reserved" || n.user_id !== userId){

await client.query("ROLLBACK")

return res.status(400).json({
message:`Número ${n.number} no reservado por ti`
})

}

}


/* marcar vendidos */

await client.query(`

UPDATE numbers
SET status='sold',
sold_at=NOW()
WHERE raffle_id=$1
AND number = ANY($2::text[])

`,[raffle_id,numbers])


/* registrar compras */

for(const n of numbers){

await client.query(`

INSERT INTO purchases
(user_id,raffle_id,number,payment_method,payment_status)
VALUES ($1,$2,$3,'PSE','paid')

`,[userId,raffle_id,n])

}


/* registrar transaccion */

await client.query(`

INSERT INTO transactions
(user_id,raffle_id,type,category,amount,payment_method,status)
VALUES ($1,$2,'income','raffle',$3,'PSE','approved')

`,[userId,raffle_id,amount])

await client.query("COMMIT")

res.json({
message:"Compra confirmada"
})

}catch(error){

await client.query("ROLLBACK")

console.error(error)

res.status(500).json({
message:"Error confirmando compra"
})

}finally{

client.release()

}

})


/* =========================
CANCELAR RESERVA
========================= */

router.post("/cancel-reservation", async (req,res)=>{

try{

const {numbers,raffle_id} = req.body

await pool.query(`

UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL

WHERE raffle_id=$1
AND number = ANY($2::text[])

`,[raffle_id,numbers])

res.json({message:"Reserva cancelada"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error cancelando reserva"})

}

})


module.exports = router