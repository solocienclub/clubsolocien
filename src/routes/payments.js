const express = require("express")
const router = express.Router()

const pool = require("../config/db")
const jwt = require("jsonwebtoken")

const { MercadoPagoConfig, Preference, Payment } = require("mercadopago")

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
})

/* =========================
CREAR PAGO
========================= */

router.post("/create", async (req,res)=>{

try{

const token = req.headers.authorization

if(!token){
return res.status(401).json({message:"No autorizado"})
}

const decoded = jwt.verify(token,process.env.JWT_SECRET)

const userId = decoded.id

const {numbers,raffle_id,amount} = req.body

/* =========================
OBTENER EMAIL DEL USUARIO
========================= */

const user = await pool.query(
`SELECT email,name FROM users WHERE id=$1`,
[userId]
)

if(user.rows.length === 0){
return res.status(404).json({message:"Usuario no encontrado"})
}

const email = user.rows[0].email
const name = user.rows[0].name

/* =========================
GUARDAR TRANSACCION
========================= */

const tx = await pool.query(

`INSERT INTO transactions
(user_id,raffle_id,type,category,amount,payment_method,status,numbers)
VALUES ($1,$2,'income','raffle',$3,'MERCADOPAGO','pending',$4)
RETURNING id`,

[userId,raffle_id,amount,numbers]

)

const transactionId = tx.rows[0].id

/* =========================
CREAR PREFERENCIA MP
========================= */

const preference = new Preference(client)

const response = await preference.create({
body:{

items:[
{
title:"Compra números rifa",
quantity:1,
unit_price:Number(amount),
currency_id:"COP"
}
],

payer:{
email: email,
name: name
},

external_reference: transactionId.toString(),

notification_url:
"https://unhoodwinked-mimetic-hilma.ngrok-free.dev/payments/webhook",

back_urls:{
success:"https://unhoodwinked-mimetic-hilma.ngrok-free.dev/pago-exitoso.html",
failure:"https://unhoodwinked-mimetic-hilma.ngrok-free.dev/pago-fallido.html",
pending:"https://unhoodwinked-mimetic-hilma.ngrok-free.dev/pago-pendiente.html"
},

auto_return:"approved"

}
})

res.json({
checkout_url:response.init_point
})

}catch(error){

console.log("MP ERROR:",error)

res.status(500).json({
message:"Error creando pago"
})

}

})

/* =========================
WEBHOOK
========================= */

router.post("/webhook", async (req,res)=>{

try{

const paymentId = req.body.data.id

const paymentClient = new Payment(client)

const payment = await paymentClient.get({ id: paymentId })

const txId = payment.external_reference

const tx = await pool.query(
`SELECT * FROM transactions WHERE id=$1`,
[txId]
)

if(tx.rows.length===0){
return res.sendStatus(200)
}

const {raffle_id,numbers} = tx.rows[0]

/* pago aprobado */

if(payment.status === "approved"){

await pool.query(`
UPDATE transactions
SET status='approved'
WHERE id=$1
`,[txId])

/* marcar números vendidos */

await pool.query(`
UPDATE numbers
SET status='sold',
sold_at=NOW()
WHERE raffle_id=$1
AND user_id=$2
AND status='reserved'
`,[raffle_id,user_id])

}

if(payment.status === "cancelled"){

await pool.query(`
UPDATE transactions
SET status='cancelled'
WHERE id=$1
`,[txId])

await pool.query(`
UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL
WHERE raffle_id=$1
AND user_id=$2
AND status='reserved'
`,[raffle_id,user_id])

}

/* pago rechazado */

if(payment.status === "rejected" || payment.status === "cancelled"){

await pool.query(

`UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL
WHERE raffle_id=$1
AND number = ANY($2::text[])`,

[raffle_id,numbers]

)

await pool.query(

`UPDATE transactions
SET status='rejected'
WHERE id=$1`,

[txId]

)

}

res.sendStatus(200)

}catch(error){

console.log(error)

res.sendStatus(500)

}

})

module.exports = router