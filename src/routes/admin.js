const express = require("express")
const router = express.Router()

const pool = require("../config/db")

const multer = require("multer")

const storage = multer.diskStorage({

destination: function (req, file, cb) {
cb(null, "public/uploads")
},

filename: function (req, file, cb) {
cb(null, Date.now() + "-" + file.originalname)
}

})

const upload = multer({ storage })

/* STATS */

router.get("/stats", async (req,res)=>{

try{

const users = await pool.query(`
SELECT COUNT(*) FROM users
`)

const raffles = await pool.query(`
SELECT COUNT(*) FROM raffles
WHERE status='active'
`)

/* SOLO PAGOS APROBADOS */

const income = await pool.query(`
SELECT COALESCE(SUM(amount),0) as total
FROM transactions
WHERE status='approved'
`)

res.json({

users: users.rows[0].count,
raffles: raffles.rows[0].count,
income: income.rows[0].total

})

}catch(error){

console.log(error)

res.status(500).json({message:"Error stats"})

}

})

/* NUMBERS */

router.get("/numbers", async(req,res)=>{

const result = await pool.query(`

SELECT
n.number,
n.status,
u.name

FROM numbers n

LEFT JOIN users u
ON n.user_id=u.id

ORDER BY n.number

`)

res.json(result.rows)

})

/* SALES */

router.get("/sales", async (req,res)=>{

const sales = await pool.query(`

SELECT 
r.title,

COUNT(n.number) as vendidos,

COUNT(n.number) * r.ticket_price as ingresos

FROM raffles r

LEFT JOIN numbers n
ON n.raffle_id = r.id
AND n.status='sold'

GROUP BY r.id

`)

res.json(sales.rows)

})

/* CREATE RAFFLE */

router.post("/create-raffle", upload.single("image"), async (req, res) => {

try{

const title = req.body.title
const prize = req.body.prize
const ticket_price = req.body.ticket_price

console.log("BODY:", req.body)

let image = null

if(req.file){
image = req.file.filename
}

const raffle = await pool.query(

`INSERT INTO raffles
(title, prize, ticket_price, prize_image, status)
VALUES ($1,$2,$3,$4,'active')
RETURNING id`,

[title, prize, ticket_price, image]

)

const id = raffle.rows[0].id

await pool.query(

`INSERT INTO numbers (raffle_id, number)
SELECT $1, LPAD(generate_series(0,99)::text,2,'0')`,

[id]

)

res.json({message:"Rifa creada"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error creando rifa"})

}

})

router.get("/users", async (req,res)=>{

try{

const users = await pool.query(`

SELECT 
u.id,
u.name,
u.lastname,
u.email,
u.cedula,

/* NUMEROS PAGADOS */

COALESCE((
SELECT COUNT(*)
FROM numbers n
WHERE n.user_id = u.id
AND n.status = 'sold'
),0) AS numeros_comprados,

/* DINERO REAL PAGADO */

COALESCE((
SELECT SUM(amount)
FROM transactions t
WHERE t.user_id = u.id
AND t.status = 'approved'
),0) AS total_gastado

FROM users u

ORDER BY u.id

`)

res.json(users.rows)

}catch(error){

console.log(error)

res.status(500).json({message:"Error cargando usuarios"})

}

})

/* =========================
OCULTAR RIFA
========================= */

router.put("/raffles/hide/:id", async (req,res)=>{

try{

const id = req.params.id

await pool.query(`
UPDATE raffles
SET status='hidden'
WHERE id=$1
`,[id])

res.json({message:"Rifa ocultada correctamente"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error ocultando rifa"})

}

})


/* =========================
MOSTRAR RIFA DE NUEVO
========================= */

router.put("/raffles/show/:id", async (req,res)=>{

try{

const id = req.params.id

await pool.query(`
UPDATE raffles
SET status='active'
WHERE id=$1
`,[id])

res.json({message:"Rifa activada nuevamente"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error activando rifa"})

}

})


/* =========================
ELIMINAR RIFA COMPLETAMENTE
========================= */

router.delete("/raffles/:id", async (req,res)=>{

try{

const id = req.params.id

/* borrar números */

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

/* borrar rifa */

await pool.query(`
DELETE FROM raffles
WHERE id=$1
`,[id])

res.json({message:"Rifa eliminada correctamente"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error eliminando rifa"})

}

})

router.put("/raffles/show/:id", async (req,res)=>{

try{

const id = req.params.id

await pool.query(`
UPDATE raffles
SET status='active'
WHERE id=$1
`,[id])

res.json({message:"Rifa activada"})

}catch(error){

console.log(error)

res.status(500).json({message:"Error activando rifa"})

}

})

/* =========================
TODAS LAS RIFAS (ADMIN)
========================= */

router.get("/raffles", async (req,res)=>{

try{

const raffles = await pool.query(`

SELECT id,title,ticket_price,status
FROM raffles
ORDER BY id DESC

`)

res.json(raffles.rows)

}catch(error){

console.log(error)

res.status(500).json({message:"Error cargando rifas"})

}

})

module.exports = router